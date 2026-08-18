export type CameraType = "fest" | "mobil" | "abschnitt";

export type CameraSource = "osm" | "user";

/** Ein Blitzer — fest installiert, mobil gemeldet, oder ein Abschnitt (Section Control). */
export interface Camera {
  id: string;
  lat: number;
  lng: number;
  type: CameraType;
  /** Zulässige Höchstgeschwindigkeit an der Stelle, falls bekannt. */
  speedLimit?: number;
  /** Straße / Ortsangabe für die Liste. */
  label: string;
  source: CameraSource;
  /** Unix-ms, nur für gemeldete (mobile) Blitzer relevant. */
  reportedAt?: number;
  /** Wie oft ein Nutzer die Meldung bestätigt hat. */
  confirmations?: number;
}

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface AppSettings {
  /** Warnradius in Metern. */
  alertRadius: number;
  soundEnabled: boolean;
  /** Wie lange gemeldete mobile Blitzer sichtbar bleiben, in Stunden. */
  reportLifetimeHours: number;
}

export interface CameraWithDistance extends Camera {
  distance: number;
}
