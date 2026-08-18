import type { Camera } from "../types";

/**
 * Beispieldatensatz fest installierter Blitzer. Es gibt keine offene,
 * lizenzfreie Live-Datenbank aller deutschen Blitzer — echte Apps wie
 * Blitzer.de kaufen/lizenzieren ihre Daten von Communitys/Anbietern. Dieser
 * Satz dient als Demo-/Startdaten, damit die App ohne Backend sofort nutzbar
 * ist; produktiv müsste er durch eine lizenzierte oder selbst gepflegte
 * Quelle ersetzt werden.
 */
export const DEMO_CAMERAS: Camera[] = [
  { id: "demo-1", lat: 52.5200, lng: 13.4050, type: "fest", speedLimit: 50, label: "Berlin, Frankfurter Allee", source: "demo" },
  { id: "demo-2", lat: 52.5006, lng: 13.4294, type: "fest", speedLimit: 50, label: "Berlin, Warschauer Straße", source: "demo" },
  { id: "demo-3", lat: 48.1351, lng: 11.5820, type: "fest", speedLimit: 60, label: "München, Landsberger Straße", source: "demo" },
  { id: "demo-4", lat: 48.1500, lng: 11.5800, type: "abschnitt", speedLimit: 80, label: "München, Mittlerer Ring (Abschnitt)", source: "demo" },
  { id: "demo-5", lat: 50.9375, lng: 6.9603, type: "fest", speedLimit: 50, label: "Köln, Innere Kanalstraße", source: "demo" },
  { id: "demo-6", lat: 53.5511, lng: 9.9937, type: "fest", speedLimit: 50, label: "Hamburg, Reeperbahn", source: "demo" },
  { id: "demo-7", lat: 53.5653, lng: 10.0014, type: "fest", speedLimit: 60, label: "Hamburg, Ost-West-Straße", source: "demo" },
  { id: "demo-8", lat: 50.1109, lng: 8.6821, type: "fest", speedLimit: 50, label: "Frankfurt, Mainzer Landstraße", source: "demo" },
  { id: "demo-9", lat: 51.2277, lng: 6.7735, type: "fest", speedLimit: 50, label: "Düsseldorf, Kölner Landstraße", source: "demo" },
  { id: "demo-10", lat: 48.7758, lng: 9.1829, type: "fest", speedLimit: 50, label: "Stuttgart, Cannstatter Straße", source: "demo" },
  { id: "demo-11", lat: 51.3397, lng: 12.3731, type: "fest", speedLimit: 60, label: "Leipzig, Georgring", source: "demo" },
  { id: "demo-12", lat: 51.0504, lng: 13.7373, type: "abschnitt", speedLimit: 80, label: "Dresden, Waldschlößchenbrücke (Abschnitt)", source: "demo" },
];
