// Descarga el mapa real de París desde OpenStreetMap (Overpass API) por arrondissement
// y lo guarda como GeoJSON simple listo para convertir a un mapa 2D.
//
// Uso (requiere Node 18+ y conexión a overpass-api.de):
//   node tools/paris/fetch-osm.mjs
// Salida: tools/paris/data/arr-01.json ... arr-20.json  (uno por arrondissement)
//
// Licencia de los datos: © OpenStreetMap contributors (ODbL). Hay que mostrar la atribución en el juego.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ENDPOINT = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
const OUT_DIR = new URL("./data/", import.meta.url).pathname;

// Código INSEE de cada arrondissement de París: 75101 … 75120
const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => 75101 + i);

const query = (insee) => `
[out:json][timeout:300];
area["ref:INSEE"="${insee}"]["boundary"="administrative"]->.a;
(
  way["highway"](area.a);
  way["building"](area.a);
  way["natural"="water"](area.a);
  way["waterway"="river"](area.a);
  relation["waterway"="river"](area.a);
  way["leisure"="park"](area.a);
  way["landuse"="grass"](area.a);
  way["railway"~"^(subway|light_rail|rail)$"](area.a);
  node["public_transport"="station"]["station"="subway"](area.a);
  node["amenity"="fountain"](area.a);
);
out geom;
`;

async function fetchArrondissement(insee) {
  const body = new URLSearchParams({ data: query(insee) });
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, { method: "POST", body });
    if (res.ok) return res.json();
    const wait = 15_000 * attempt;
    console.warn(`  HTTP ${res.status} en ${insee}, reintento ${attempt} en ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
  }
  throw new Error(`No se pudo descargar ${insee} tras 4 intentos`);
}

await mkdir(OUT_DIR, { recursive: true });

for (const insee of ARRONDISSEMENTS) {
  const name = `arr-${String(insee - 75100).padStart(2, "0")}`;
  console.log(`Descargando ${name} (INSEE ${insee})…`);
  const json = await fetchArrondissement(insee);
  const file = join(OUT_DIR, `${name}.json`);
  await writeFile(file, JSON.stringify(json));
  console.log(`  ${json.elements.length} elementos → ${file}`);
  // Cortesía con el servidor público de Overpass
  await new Promise((r) => setTimeout(r, 3000));
}

console.log("Listo. Siguiente paso: convertir a mapa 2D (ver README).");
