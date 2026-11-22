// Generador de la ciudad ficticia "Lutèce Nueva" (inspirada en la estructura de París).
// No usa datos de OpenStreetMap: todo el mapa es original.
//
// Uso:  node tools/city/generate-city.mjs
// Salida: tools/city/city.json

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

// ---------- Parámetros ----------
const W = 128;          // ancho en tiles
const H = 96;           // alto en tiles
const SEED = 1889;      // año de la torre (semilla fija = mapa siempre igual)
const BLOCK = 10;       // paso de la cuadrícula de calles
const ROAD_W = 2;       // ancho de calle en tiles
const STAR = { x: 64, y: 38, r: 5 }; // plaza central (la "Étoile" ficticia)

// ---------- Códigos de terreno ----------
export const T = {
  GRASS: 0, ROAD: 1, SIDEWALK: 2, BUILDING: 3, PARK: 4,
  PLAZA: 5, BRIDGE: 6, WATER: 7, COURTYARD: 8, METRO: 9, TREE: 10,
};

// ---------- Utilidades ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(SEED);
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)); // entero en [a, b]

// Río: curva suave de oeste a este, como el Sena (pero ficticio: "Lisne")
const riverY = (x) => 62 + 7 * Math.sin(x / 22) + 2 * Math.sin(x / 6);
const RIVER_HALF = 3;

// Isla central (ficticia: "Île de la Cité Nueva")
const isIsland = (x, y) => x >= 56 && x <= 74 && Math.abs(y - riverY(x)) <= 2.2;

// Colina NE con basílica ("Butte Sainte-Aurore")
const HILL = { x: 108, y: 18, r: 16 };

// Barrio chino-lanterna SW (inspiración Chinatown, nombre propio)
const inLanterna = (x, y) => x < 40 && y > 66;

const isRoadX = (x) => x % BLOCK < ROAD_W;
const isRoadY = (y) => y % BLOCK < ROAD_W;

// ---------- Construcción de la rejilla ----------
const N = W * H;
const tiles = new Uint8Array(N);
const levels = new Uint8Array(N);
const district = new Uint8Array(N);
const idx = (x, y) => y * W + x;

// Distritos
const DISTRICTS = [
  { id: 0, name: "Lutèce Centro", palette: "piedra cálida" },
  { id: 1, name: "Butte Sainte-Aurore", palette: "crema y verde musgo" },
  { id: 2, name: "Quartier Lanterne", palette: "rojo laca y oro" },
  { id: 3, name: "Marais Azul", palette: "azul pizarra y ocre" },
  { id: 4, name: "Jardins du Roi", palette: "verde saturado" },
];
function districtOf(x, y) {
  if (HILL && Math.hypot(x - HILL.x, y - HILL.y) < HILL.r) return 1;
  if (inLanterna(x, y)) return 2;
  if (x > 84 && y > 52) return 3;
  if (x < 30 && y < 40) return 4;
  return 0;
}

// 1) Base: bloques de la cuadrícula
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    district[i] = districtOf(x, y);

    if (isRoadX(x) || isRoadY(y)) {
      tiles[i] = T.ROAD;
      continue;
    }

    // Posición dentro del bloque (0..BLOCK-ROAD_W-1)
    const bx = Math.floor(x / BLOCK), by = Math.floor(y / BLOCK);
    const lx = x % BLOCK - ROAD_W, ly = y % BLOCK - ROAD_W;
    const size = BLOCK - ROAD_W; // 8
    const onEdge = lx === 0 || ly === 0 || lx === size - 1 || ly === size - 1;

    // Tipo de bloque decidido por hash determinista (no por orden de llamada)
    const h = ((bx * 73856093) ^ (by * 19349663) ^ SEED) >>> 0;
    const kind = h % 100;

    if (kind < 12) {
      tiles[i] = T.PARK;                       // jardín
    } else if (kind < 18) {
      tiles[i] = T.PLAZA;                      // plaza
    } else if (onEdge) {
      tiles[i] = T.SIDEWALK;                   // acera alrededor del edificio
    } else {
      const inner = (lx > 1 && lx < size - 2 && ly > 1 && ly < size - 2);
      tiles[i] = inner && lx > 2 && lx < size - 3 && ly > 2 && ly < size - 3
        ? T.COURTYARD                          // patio interior
        : T.BUILDING;
      if (tiles[i] === T.BUILDING) {
        const base = districtOf(x, y) === 1 ? ri(3, 8) : districtOf(x, y) === 0 ? ri(5, 7) : ri(2, 5);
        levels[i] = base;
      }
    }
  }
}

// 2) Avenidas radiales de la estrella (diagonales y ejes)
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - STAR.x, dy = y - STAR.y;
    const d = Math.hypot(dx, dy);
    if (d < STAR.r + 0.5) continue;
    if (d > 28) continue;
    const onAxis = Math.abs(dx) < 1 || Math.abs(dy) < 1;
    const onDiag = Math.abs(Math.abs(dx) - Math.abs(dy)) < 1.2;
    if (onAxis || onDiag) tiles[idx(x, y)] = T.ROAD;
  }
}
// Plaza circular central con torre
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - STAR.x, y - STAR.y);
    if (d <= STAR.r) {
      tiles[idx(x, y)] = T.PLAZA;
      levels[idx(x, y)] = 0;
    }
  }
}
// Torre "Tour Azur" (el Eiffel ficticio): 4x4 tiles en el centro
for (let y = STAR.y - 1; y <= STAR.y + 2; y++) {
  for (let x = STAR.x - 1; x <= STAR.x + 2; x++) {
    tiles[idx(x, y)] = T.BUILDING;
    levels[idx(x, y)] = 14;
  }
}

// 3) Río, isla y puentes
for (let x = 0; x < W; x++) {
  const ry = riverY(x);
  for (let y = 0; y < H; y++) {
    const dist = Math.abs(y - ry);
    const i = idx(x, y);
    if (isIsland(x, y)) {
      tiles[i] = T.PARK;
      levels[i] = 0;
      district[i] = 0;
      continue;
    }
    if (dist <= RIVER_HALF) {
      tiles[i] = isRoadX(x) && tiles[i] === T.ROAD ? T.BRIDGE : T.WATER;
      levels[i] = 0;
    } else if (dist <= RIVER_HALF + 2 && tiles[i] !== T.ROAD) {
      tiles[i] = T.SIDEWALK;                   // muelles del río
      levels[i] = 0;
    }
  }
}

// 4) Basílica en la colina
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - HILL.x, y - HILL.y);
    if (d < 3 && tiles[idx(x, y)] !== T.WATER) {
      tiles[idx(x, y)] = T.PLAZA;
      levels[idx(x, y)] = 0;
    }
  }
}

// 5) Estaciones de metro: cruces de calles principales
const metro = [];
for (let bx = 1; bx < W / BLOCK; bx += 2) {
  for (let by = 1; by < H / BLOCK; by += 2) {
    const x = bx * BLOCK, y = by * BLOCK;
    if (x >= W || y >= H) continue;
    const i = idx(x, y);
    if (tiles[i] === T.ROAD) {
      tiles[i] = T.METRO;
      metro.push({ x, y, name: `Estación ${metro.length + 1}` });
    }
  }
}

// 6) Hitos con nombre (los nombres son originales)
const landmarks = [
  { name: "Tour Azur", x: STAR.x, y: STAR.y, kind: "torre" },
  { name: "Basílica Sainte-Aurore", x: HILL.x, y: HILL.y, kind: "basílica" },
  { name: "Arco de la Victoria Nueva", x: STAR.x, y: STAR.y - 12, kind: "arco" },
  { name: "Catedral de Lutèce", x: 52, y: 26, kind: "catedral" },
  { name: "Museo del Louvre-Ficticio", x: 30, y: 40, kind: "museo" },
  { name: "Gran Mercado de la Lanterna", x: 20, y: 80, kind: "mercado" },
];

// ---------- Salida ----------
function flatten(arr) { return Array.from(arr); }

const output = {
  name: "Lutèce Nueva",
  description: "Ciudad ficticia inspirada en París. Mapa original, sin datos de OpenStreetMap.",
  seed: SEED,
  width: W,
  height: H,
  tileSize: 16,
  tileCodes: T,
  districts: DISTRICTS,
  tiles: flatten(tiles),      // índice = y * width + x
  levels: flatten(levels),    // plantas de cada edificio (0 si no es edificio)
  district: flatten(district),
  landmarks,
  metro,
};

await mkdir(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, "city.json");
await writeFile(file, JSON.stringify(output));
console.log(`Ciudad generada: ${W}x${H} tiles, ${metro.length} estaciones de metro → ${file}`);
