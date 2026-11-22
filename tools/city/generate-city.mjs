// Generador de la ciudad ficticia "Lutèce Nueva" (inspirada en la estructura de París).
// Mapa original desde cero: no usa datos de OpenStreetMap.
//
// Uso:  node tools/city/generate-city.mjs
// Salida: tools/city/city.json  (determinista: misma semilla = mismo mapa)

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

// ---------- Parámetros ----------
const W = 128;
const H = 96;
const SEED = 1889;
const ROAD_W = 2;
const STAR = { x: 64, y: 38, r: 5 };
const HILL = { x: 108, y: 18, r: 16 };
const RIVER_HALF = 3;

// ---------- Códigos de terreno ----------
export const T = {
  GRASS: 0, ROAD: 1, SIDEWALK: 2, BUILDING: 3, PARK: 4,
  PLAZA: 5, BRIDGE: 6, WATER: 7, COURTYARD: 8, METRO: 9,
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
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const hash2 = (a, b) => ((Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ SEED) >>> 0) % 100;

// Río de oeste a este (ficticio: "Lisne")
const riverY = (x) => 62 + 7 * Math.sin(x / 22) + 2 * Math.sin(x / 6);
const isIsland = (x, y) => x >= 56 && x <= 74 && Math.abs(y - riverY(x)) <= 2.2;
const inHill = (x, y) => Math.hypot(x - HILL.x, y - HILL.y) < HILL.r;
const inLanterna = (x, y) => x < 40 && y > 66;

function districtOf(x, y) {
  if (inHill(x, y)) return 1;
  if (inLanterna(x, y)) return 2;
  if (x > 84 && y > 52) return 3;
  if (x < 30 && y < 40) return 4;
  return 0;
}
export const DISTRICTS = [
  { id: 0, name: "Lutèce Centro", palette: "piedra cálida" },
  { id: 1, name: "Butte Sainte-Aurore", palette: "crema y verde musgo" },
  { id: 2, name: "Quartier Lanterne", palette: "rojo laca y oro" },
  { id: 3, name: "Marais Azul", palette: "azul pizarra y ocre" },
  { id: 4, name: "Jardins du Roi", palette: "verde saturado" },
];

// ---------- Rejilla base ----------
const N = W * H;
const tiles = new Uint8Array(N).fill(T.GRASS);
const levels = new Uint8Array(N);
const district = new Uint8Array(N);
const idx = (x, y) => y * W + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

// Calles de ancho fijo y separación variable entre ellas (bloques de 6 a 12 tiles)
function roadMask(len) {
  const road = new Uint8Array(len);
  let x = ri(2, 6);
  while (x < len) {
    for (let k = 0; k < ROAD_W && x + k < len; k++) road[x + k] = 1;
    x += ROAD_W + ri(6, 12);
  }
  return road;
}
const roadX = roadMask(W);
const roadY = roadMask(H);

// 1) Calles de la cuadrícula
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (roadX[x] || roadY[y]) tiles[idx(x, y)] = T.ROAD;
}

// 2) Bloques: rectángulos entre calles. Cada bloque elige su uso por hash.
function spans(mask) {
  const out = [];
  let a = -1;
  for (let i = 0; i <= mask.length; i++) {
    const free = i < mask.length && !mask[i];
    if (free && a < 0) a = i;
    if (!free && a >= 0) { out.push([a, i - 1]); a = -1; }
  }
  return out;
}
for (const [x0, x1] of spans(roadX)) {
  for (const [y0, y1] of spans(roadY)) {
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const kind = hash2(x0, y0);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      district[i] = districtOf(x, y);
      const onEdge = x === x0 || y === y0 || x === x1 || y === y1;
      if (kind < 12) { tiles[i] = T.PARK; continue; }
      if (kind < 18) { tiles[i] = T.PLAZA; continue; }
      if (onEdge) { tiles[i] = T.SIDEWALK; continue; }
      const cw = w - 4, ch = h - 4; // zona interior de edificio
      const inCourt = cw >= 3 && ch >= 3 &&
        x >= x0 + 2 && x <= x1 - 2 && y >= y0 + 2 && y <= y1 - 2 &&
        x >= x0 + 3 && x <= x1 - 3 && y >= y0 + 3 && y <= y1 - 3;
      if (inCourt && w >= 8 && h >= 8) { tiles[i] = T.COURTYARD; continue; }
      tiles[i] = T.BUILDING;
      const d = district[i];
      levels[i] = d === 1 ? ri(3, 8) : d === 0 ? ri(5, 7) : ri(2, 5);
    }
  }
}

// 3) Avenidas radiales de la estrella: bulevares de 2 tiles con aceras limpias
const onAvenue = (dx, dy) => {
  const d = Math.hypot(dx, dy);
  if (d < STAR.r + 0.5 || d > 28) return false;
  const axis = Math.abs(dx) < 1 || Math.abs(dy) < 1;
  // Diagonal: distancia perpendicular a la recta y = ±x
  const perpA = Math.abs(dx - dy) / Math.SQRT2;
  const perpB = Math.abs(dx + dy) / Math.SQRT2;
  const diag = perpA < 1.0 || perpB < 1.0;
  return axis || diag;
};
const nearAvenue = (dx, dy) => {
  const d = Math.hypot(dx, dy);
  if (d < STAR.r + 0.5 || d > 29) return false;
  const axis = Math.abs(dx) < 2.5 || Math.abs(dy) < 2.5;
  const perpA = Math.abs(dx - dy) / Math.SQRT2;
  const perpB = Math.abs(dx + dy) / Math.SQRT2;
  return axis || perpA < 2.4 || perpB < 2.4;
};
// Primero acera alrededor de la avenida, después calzada
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const dx = x - STAR.x, dy = y - STAR.y;
  const i = idx(x, y);
  if (nearAvenue(dx, dy) && !onAvenue(dx, dy)) {
    if (tiles[i] === T.BUILDING || tiles[i] === T.COURTYARD || tiles[i] === T.PARK) {
      tiles[i] = T.SIDEWALK; levels[i] = 0;
    }
  }
}
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (onAvenue(x - STAR.x, y - STAR.y)) {
    tiles[idx(x, y)] = T.ROAD; levels[idx(x, y)] = 0;
  }
}

// 4) Plaza circular central y torre "Tour Azur" (4x4)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (Math.hypot(x - STAR.x, y - STAR.y) <= STAR.r) {
    tiles[idx(x, y)] = T.PLAZA; levels[idx(x, y)] = 0;
  }
}
for (let y = STAR.y - 1; y <= STAR.y + 2; y++) for (let x = STAR.x - 1; x <= STAR.x + 2; x++) {
  tiles[idx(x, y)] = T.BUILDING; levels[idx(x, y)] = 14;
}

// 5) Río, isla urbana y puentes
for (let x = 0; x < W; x++) {
  const ry = riverY(x);
  for (let y = 0; y < H; y++) {
    const i = idx(x, y);
    const dist = Math.abs(y - ry);
    if (isIsland(x, y)) {
      // Isla: parque en los bordes, edificios en el núcleo
      const core = dist < 0.8 && x > 58 && x < 72;
      tiles[i] = core ? T.BUILDING : T.PARK;
      levels[i] = core ? 4 : 0;
      district[i] = 0;
      continue;
    }
    if (dist <= RIVER_HALF) {
      // Puentes: solo donde una calle vertical cruza el río
      tiles[i] = roadX[x] ? T.BRIDGE : T.WATER;
      levels[i] = 0;
    } else if (dist <= RIVER_HALF + 2 && tiles[i] !== T.ROAD) {
      tiles[i] = T.SIDEWALK; levels[i] = 0;   // muelles
    }
  }
}

// 6) Basílica en la colina (plaza con silueta)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (Math.hypot(x - HILL.x, y - HILL.y) < 3 && tiles[idx(x, y)] !== T.WATER) {
    tiles[idx(x, y)] = T.PLAZA; levels[idx(x, y)] = 0;
  }
}

// 7) Estaciones de metro en cruces de calles
const metro = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!roadX[x] || !roadY[y]) continue;
  // Una estación cada ~3 cruces, sin pisar el agua ni la estrella
  if ((x + y) % 12 !== 0 || tiles[idx(x, y)] !== T.ROAD) continue;
  if (Math.hypot(x - STAR.x, y - STAR.y) < STAR.r + 2) continue;
  tiles[idx(x, y)] = T.METRO;
  metro.push({ x, y, name: `Estación ${metro.length + 1}` });
}

// 8) Hitos con nombre y posición de etiqueta separada
const landmarks = [
  { name: "Tour Azur", x: STAR.x, y: STAR.y, kind: "torre", label: { dx: 3, dy: 0 } },
  { name: "Arco de la Victoria Nueva", x: STAR.x, y: STAR.y - 12, kind: "arco", label: { dx: 3, dy: 0 } },
  { name: "Catedral de Lutèce", x: 52, y: 26, kind: "catedral", label: { dx: -2, dy: -2 } },
  { name: "Museo del Louvre-Ficticio", x: 30, y: 40, kind: "museo", label: { dx: 2, dy: 0 } },
  { name: "Basílica Sainte-Aurore", x: HILL.x, y: HILL.y, kind: "basílica", label: { dx: 3, dy: -2 } },
  { name: "Gran Mercado de la Lanterna", x: 20, y: 80, kind: "mercado", label: { dx: 2, dy: 1 } },
];

// ---------- Salida ----------
const output = {
  name: "Lutèce Nueva",
  description: "Ciudad ficticia inspirada en París. Mapa original, sin datos de OpenStreetMap.",
  seed: SEED,
  width: W,
  height: H,
  tileSize: 16,
  tileCodes: T,
  districts: DISTRICTS,
  tiles: Array.from(tiles),
  levels: Array.from(levels),
  district: Array.from(district),
  landmarks,
  metro,
};

await mkdir(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, "city.json");
await writeFile(file, JSON.stringify(output));
console.log(`Ciudad generada: ${W}x${H} tiles, ${metro.length} estaciones de metro → ${file}`);
