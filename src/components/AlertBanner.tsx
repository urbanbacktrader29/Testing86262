import { useApp } from "../context/AppContext";
import { CAMERA_ICONS, CAMERA_LABELS } from "../utils/cameraStyle";
import { formatDistance } from "../utils/geo";

export default function AlertBanner() {
  const { activeAlert, dismissAlert } = useApp();
  if (!activeAlert) return null;

  const { camera, distance } = activeAlert;

  return (
    <div
      role="alert"
      className="sticky top-[57px] z-20 mx-auto w-full min-w-0 max-w-7xl px-4 pt-2 safe-top box-border"
    >
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 shadow-lg backdrop-blur">
        <span className="text-2xl leading-none">{CAMERA_ICONS[camera.type]}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-300 text-sm truncate">
            {CAMERA_LABELS[camera.type]} in {formatDistance(distance)}
          </p>
          <p className="text-xs text-amber-200/80 truncate">
            {camera.label}
            {camera.speedLimit ? ` · Tempolimit ${camera.speedLimit} km/h` : ""}
          </p>
        </div>
        <button
          onClick={dismissAlert}
          className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-amber-200/80 hover:bg-amber-500/20"
          aria-label="Warnung ausblenden"
        >
          Ausblenden
        </button>
      </div>
    </div>
  );
}
