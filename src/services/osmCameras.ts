import type { Camera, CameraType } from "../types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function parseSpeedLimit(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

function cameraLabel(tags: Record<string, string> | undefined): string {
  if (!tags) return "Blitzer (OpenStreetMap)";
  const road = tags.name ?? tags.ref ?? tags["addr:street"];
  return road ? road : "Blitzer (OpenStreetMap)";
}

function mapElement(el: OverpassElement): Camera {
  const type: CameraType = el.tags?.enforcement === "maxspeed" ? "abschnitt" : "fest";
  return {
    id: `osm-${el.id}`,
    lat: el.lat,
    lng: el.lon,
    type,
    speedLimit: parseSpeedLimit(el.tags?.maxspeed),
    label: cameraLabel(el.tags),
    source: "osm",
  };
}

/**
 * Lädt echte, von der OpenStreetMap-Community erfasste Blitzerstandorte
 * (highway=speed_camera, enforcement=maxspeed) in einem Radius um einen
 * Punkt. Weltweit nutzbar — Abdeckung hängt von der jeweiligen OSM-Region ab
 * (in Mitteleuropa i. d. R. sehr gut, anderswo lückenhaft), da es keine
 * offene, vollständige globale Blitzerdatenbank gibt.
 */
export async function fetchCamerasAround(lat: number, lng: number, radiusMeters: number): Promise<Camera[]> {
  const query = `[out:json][timeout:25];(node["highway"="speed_camera"](around:${radiusMeters},${lat},${lng});node["enforcement"="maxspeed"](around:${radiusMeters},${lat},${lng}););out body;`;

  let res: Response;
  try {
    res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
    });
  } catch {
    throw new Error("Blitzerdaten von OpenStreetMap nicht erreichbar. Internetverbindung prüfen.");
  }

  if (!res.ok) {
    throw new Error(`Overpass-API-Fehler (${res.status}). Bitte später erneut versuchen.`);
  }

  const data = (await res.json()) as OverpassResponse;
  return data.elements.filter((el) => el.lat != null && el.lon != null).map(mapElement);
}
