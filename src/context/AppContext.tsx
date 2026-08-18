import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DEMO_CAMERAS } from "../data/cameras";
import { useGeolocation } from "../hooks/useGeolocation";
import { useReportedCameras } from "../hooks/useReportedCameras";
import { useSettings } from "../hooks/useSettings";
import type { Camera, CameraType, CameraWithDistance, GeoPosition } from "../types";
import { distanceMeters } from "../utils/geo";
import { playAlertBeep } from "../utils/sound";

interface AlertState {
  camera: CameraWithDistance;
  distance: number;
}

interface AppContextValue {
  position: GeoPosition | null;
  geoError: string | null;
  geoSupported: boolean;
  tracking: boolean;
  setTracking: (on: boolean) => void;
  cameras: Camera[];
  camerasWithDistance: CameraWithDistance[];
  addReport: (lat: number, lng: number, type: CameraType, speedLimit?: number, note?: string) => Camera;
  removeReport: (id: string) => void;
  confirmReport: (id: string) => void;
  settings: ReturnType<typeof useSettings>["settings"];
  updateSettings: ReturnType<typeof useSettings>["update"];
  activeAlert: AlertState | null;
  dismissAlert: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tracking, setTracking] = useState(true);
  const { settings, update: updateSettings } = useSettings();
  const { position, error: geoError, supported: geoSupported } = useGeolocation(tracking);
  const { reports, addReport, removeReport, confirmReport } = useReportedCameras(settings.reportLifetimeHours);

  const cameras = useMemo(() => [...DEMO_CAMERAS, ...reports], [reports]);

  const camerasWithDistance = useMemo<CameraWithDistance[]>(() => {
    if (!position) return cameras.map((c) => ({ ...c, distance: Infinity }));
    return cameras
      .map((c) => ({ ...c, distance: distanceMeters(position.lat, position.lng, c.lat, c.lng) }))
      .sort((a, b) => a.distance - b.distance);
  }, [cameras, position]);

  const [activeAlert, setActiveAlert] = useState<AlertState | null>(null);
  const alertedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!position) return;
    const nearest = camerasWithDistance[0];
    if (nearest && nearest.distance <= settings.alertRadius) {
      if (alertedIdRef.current !== nearest.id) {
        alertedIdRef.current = nearest.id;
        setActiveAlert({ camera: nearest, distance: nearest.distance });
        if (settings.soundEnabled) playAlertBeep();
      } else {
        setActiveAlert({ camera: nearest, distance: nearest.distance });
      }
    } else if (nearest && nearest.distance > settings.alertRadius * 1.5) {
      alertedIdRef.current = null;
      setActiveAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camerasWithDistance, position, settings.alertRadius]);

  const dismissAlert = () => setActiveAlert(null);

  const value: AppContextValue = {
    position,
    geoError,
    geoSupported,
    tracking,
    setTracking,
    cameras,
    camerasWithDistance,
    addReport,
    removeReport,
    confirmReport,
    settings,
    updateSettings,
    activeAlert,
    dismissAlert,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp muss innerhalb von <AppProvider> verwendet werden.");
  return ctx;
}
