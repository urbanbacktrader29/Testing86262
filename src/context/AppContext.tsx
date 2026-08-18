import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGeolocation } from "../hooks/useGeolocation";
import { useSyncedReports } from "../hooks/useSyncedReports";
import { useSettings } from "../hooks/useSettings";
import { fetchCamerasAround } from "../services/osmCameras";
import type { Camera, CameraType, CameraWithDistance, GeoPosition } from "../types";
import { distanceMeters } from "../utils/geo";
import { playAlertBeep } from "../utils/sound";

const AUTO_LOAD_RADIUS_M = 15_000;
/** Erst neu laden, wenn sich der Standort seit dem letzten Abruf deutlich verschoben hat. */
const REFETCH_THRESHOLD_M = 5_000;

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
  addReport: (lat: number, lng: number, type: CameraType, speedLimit?: number, note?: string) => Promise<Camera>;
  removeReport: (id: string) => void;
  confirmReport: (id: string) => void;
  settings: ReturnType<typeof useSettings>["settings"];
  updateSettings: ReturnType<typeof useSettings>["update"];
  activeAlert: AlertState | null;
  dismissAlert: () => void;
  osmLoading: boolean;
  osmError: string | null;
  loadCamerasAround: (lat: number, lng: number, radiusMeters?: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tracking, setTracking] = useState(true);
  const { settings, update: updateSettings } = useSettings();
  const { position, error: geoError, supported: geoSupported } = useGeolocation(tracking);
  const { reports, addReport, removeReport, confirmReport } = useSyncedReports(settings.reportLifetimeHours);

  const [osmCameras, setOsmCameras] = useState<Camera[]>([]);
  const [osmLoading, setOsmLoading] = useState(false);
  const [osmError, setOsmError] = useState<string | null>(null);
  const lastFetchCenter = useRef<{ lat: number; lng: number } | null>(null);

  const loadCamerasAround = async (lat: number, lng: number, radiusMeters = AUTO_LOAD_RADIUS_M) => {
    setOsmLoading(true);
    setOsmError(null);
    try {
      const found = await fetchCamerasAround(lat, lng, radiusMeters);
      setOsmCameras((prev) => {
        const merged = new Map(prev.map((c) => [c.id, c]));
        for (const c of found) merged.set(c.id, c);
        return [...merged.values()];
      });
      lastFetchCenter.current = { lat, lng };
    } catch (err) {
      setOsmError(err instanceof Error ? err.message : "Blitzerdaten konnten nicht geladen werden.");
    } finally {
      setOsmLoading(false);
    }
  };

  useEffect(() => {
    if (!position) return;
    const last = lastFetchCenter.current;
    if (last && distanceMeters(last.lat, last.lng, position.lat, position.lng) < REFETCH_THRESHOLD_M) return;
    void loadCamerasAround(position.lat, position.lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  const cameras = useMemo(() => [...osmCameras, ...reports], [osmCameras, reports]);

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
    osmLoading,
    osmError,
    loadCamerasAround,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp muss innerhalb von <AppProvider> verwendet werden.");
  return ctx;
}
