import { useApp } from "../context/AppContext";
import { CAMERA_ICONS, CAMERA_LABELS } from "../utils/cameraStyle";
import { formatDistance } from "../utils/geo";

export default function ListPage() {
  const { camerasWithDistance, position, removeReport, confirmReport } = useApp();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Blitzer in der Nähe</h1>
        <p className="text-sm text-slate-400">
          {position ? "Sortiert nach Entfernung zu deinem Standort." : "Aktiviere den Standort für eine Sortierung nach Entfernung."}
        </p>
      </div>

      {camerasWithDistance.length === 0 && (
        <p className="text-sm text-slate-500">Keine Blitzer bekannt.</p>
      )}

      <ul className="space-y-2">
        {camerasWithDistance.map((camera) => (
          <li
            key={camera.id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
          >
            <span className="text-2xl leading-none">{CAMERA_ICONS[camera.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{camera.label}</p>
              <p className="text-xs text-slate-400">
                {CAMERA_LABELS[camera.type]}
                {camera.speedLimit ? ` · ${camera.speedLimit} km/h` : ""}
                {camera.source === "user" && camera.confirmations ? ` · ${camera.confirmations}× bestätigt` : ""}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-slate-200">
                {Number.isFinite(camera.distance) ? formatDistance(camera.distance) : "–"}
              </p>
              {camera.source === "user" ? (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => confirmReport(camera.id)} className="text-xs text-emerald-400 hover:underline">
                    Bestätigen
                  </button>
                  <button onClick={() => removeReport(camera.id)} className="text-xs text-rose-400 hover:underline">
                    Löschen
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Demo-Daten</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
