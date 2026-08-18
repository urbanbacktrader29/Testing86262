import { useCallback, useEffect, useState } from "react";
import type { Camera, CameraType } from "../types";

const STORAGE_KEY = "blitzer-reports";

function readReports(): Camera[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Camera[]) : [];
  } catch {
    return [];
  }
}

/**
 * Von Nutzer:innen gemeldete (mobile) Blitzer — rein lokal im Browser
 * gespeichert. Es gibt kein Backend, das Meldungen zwischen Geräten teilt;
 * "Community"-Meldungen sind in dieser Version geräteweise.
 */
export function useReportedCameras(lifetimeHours: number) {
  const [reports, setReports] = useState<Camera[]>(() => readReports());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  // Abgelaufene mobile Meldungen periodisch aussortieren.
  useEffect(() => {
    const prune = () => {
      const cutoff = Date.now() - lifetimeHours * 3600_000;
      setReports((prev) => prev.filter((c) => c.type !== "mobil" || (c.reportedAt ?? 0) >= cutoff));
    };
    prune();
    const id = setInterval(prune, 60_000);
    return () => clearInterval(id);
  }, [lifetimeHours]);

  const addReport = useCallback((lat: number, lng: number, type: CameraType, speedLimit?: number, note?: string) => {
    const camera: Camera = {
      id: `user-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      lat,
      lng,
      type,
      speedLimit,
      label: note?.trim() || "Gemeldeter Blitzer",
      source: "user",
      reportedAt: Date.now(),
      confirmations: 1,
    };
    setReports((prev) => [...prev, camera]);
    return camera;
  }, []);

  const removeReport = useCallback((id: string) => {
    setReports((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const confirmReport = useCallback((id: string) => {
    setReports((prev) =>
      prev.map((c) => (c.id === id ? { ...c, confirmations: (c.confirmations ?? 1) + 1, reportedAt: Date.now() } : c)),
    );
  }, []);

  return { reports, addReport, removeReport, confirmReport };
}
