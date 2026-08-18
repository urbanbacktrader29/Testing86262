import type { CameraType } from "../types";

export const CAMERA_LABELS: Record<CameraType, string> = {
  fest: "Fester Blitzer",
  mobil: "Mobiler Blitzer (gemeldet)",
  abschnitt: "Abschnittskontrolle",
};

export const CAMERA_ICONS: Record<CameraType, string> = {
  fest: "📷",
  mobil: "🚓",
  abschnitt: "📏",
};

export const CAMERA_COLORS: Record<CameraType, string> = {
  fest: "#f43f5e",
  mobil: "#f59e0b",
  abschnitt: "#8b5cf6",
};
