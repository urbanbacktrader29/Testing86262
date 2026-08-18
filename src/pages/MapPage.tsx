import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useApp } from "../context/AppContext";
import { CAMERA_COLORS, CAMERA_ICONS, CAMERA_LABELS } from "../utils/cameraStyle";
import { formatDistance } from "../utils/geo";

const DEFAULT_CENTER: [number, number] = [51.1657, 10.4515]; // Deutschland, Mitte

function cameraIcon(type: keyof typeof CAMERA_COLORS) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${CAMERA_COLORS[type]};
      display:flex;align-items:center;justify-content:center;
      font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,.5);
      border:2px solid rgba(255,255,255,.85);
    ">${CAMERA_ICONS[type]}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;background:#22d3ee;
    border:3px solid rgba(255,255,255,.9);box-shadow:0 0 0 4px rgba(34,211,238,.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FollowUser({ lat, lng, enabled }: { lat: number; lng: number; enabled: boolean }) {
  const map = useMap();
  const hasCentered = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (!hasCentered.current) {
      map.setView([lat, lng], 14);
      hasCentered.current = true;
    } else {
      map.panTo([lat, lng], { animate: true });
    }
  }, [lat, lng, enabled, map]);
  return null;
}

export default function MapPage() {
  const { position, geoError, geoSupported, tracking, setTracking, camerasWithDistance, settings, removeReport } = useApp();

  const center = useMemo<[number, number]>(
    () => (position ? [position.lat, position.lng] : DEFAULT_CENTER),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Karte</h1>
          <p className="text-sm text-slate-400">
            {position
              ? `Standort erkannt · Genauigkeit ±${Math.round(position.accuracy)} m`
              : geoSupported
                ? "Warte auf Standort …"
                : "Geolocation wird von diesem Browser nicht unterstützt."}
          </p>
        </div>
        <button
          onClick={() => setTracking(!tracking)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tracking ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-300"
          }`}
        >
          {tracking ? "Live-Ortung an" : "Live-Ortung aus"}
        </button>
      </div>

      {geoError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
          {geoError} — Standortfreigabe wird für Live-Warnungen benötigt.
        </div>
      )}

      <div className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-xl border border-slate-800">
        <MapContainer center={center} zoom={position ? 14 : 6} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {position && (
            <>
              <FollowUser lat={position.lat} lng={position.lng} enabled={tracking} />
              <Marker position={[position.lat, position.lng]} icon={userIcon}>
                <Popup>Dein Standort</Popup>
              </Marker>
              <Circle
                center={[position.lat, position.lng]}
                radius={settings.alertRadius}
                pathOptions={{ color: "#22d3ee", fillOpacity: 0.05, weight: 1 }}
              />
            </>
          )}
          {camerasWithDistance.map((camera) => (
            <Marker key={camera.id} position={[camera.lat, camera.lng]} icon={cameraIcon(camera.type)}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{CAMERA_LABELS[camera.type]}</p>
                  <p>{camera.label}</p>
                  {camera.speedLimit && <p>Tempolimit: {camera.speedLimit} km/h</p>}
                  {Number.isFinite(camera.distance) && <p>Entfernung: {formatDistance(camera.distance)}</p>}
                  {camera.source === "user" && (
                    <button
                      onClick={() => removeReport(camera.id)}
                      className="mt-2 text-rose-600 underline"
                    >
                      Meldung löschen
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <p className="text-xs text-slate-500">
        📷 Fester Blitzer · 🚓 gemeldeter mobiler Blitzer · 📏 Abschnittskontrolle. Fest installierte Blitzer sind ein
        Demo-Datensatz für ausgewählte Städte, keine vollständige oder amtliche Liste.
      </p>
    </div>
  );
}
