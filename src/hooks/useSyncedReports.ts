import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import type { Camera, CameraType } from "../types";

interface ReportRow {
  id: string;
  lat: number;
  lng: number;
  type: CameraType;
  speed_limit: number | null;
  note: string | null;
  confirmations: number;
  created_at: string;
}

function rowToCamera(row: ReportRow): Camera {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    type: row.type,
    speedLimit: row.speed_limit ?? undefined,
    label: row.note?.trim() || "Gemeldeter Blitzer",
    source: "user",
    reportedAt: new Date(row.created_at).getTime(),
    confirmations: row.confirmations,
  };
}

/**
 * Von Nutzer:innen gemeldete (mobile) Blitzer — in Supabase gespeichert und
 * per Realtime zwischen allen verbundenen Geräten synchronisiert. Es gibt
 * (noch) kein Login-System, Meldungen sind also anonym und für alle
 * bearbeitbar — siehe Hinweis in den Einstellungen/README.
 */
export function useSyncedReports(lifetimeHours: number) {
  const [reports, setReports] = useState<Camera[]>([]);
  const reportsRef = useRef<Camera[]>([]);
  reportsRef.current = reports;

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("camera_reports")
      .select("*")
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setReports((data as ReportRow[]).map(rowToCamera));
      });

    const channel = supabase
      .channel("camera_reports_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "camera_reports" }, (payload) => {
        const next = rowToCamera(payload.new as ReportRow);
        setReports((prev) => (prev.some((c) => c.id === next.id) ? prev : [...prev, next]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "camera_reports" }, (payload) => {
        const next = rowToCamera(payload.new as ReportRow);
        setReports((prev) => prev.map((c) => (c.id === next.id ? next : c)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "camera_reports" }, (payload) => {
        const oldId = (payload.old as Partial<ReportRow>).id;
        setReports((prev) => prev.filter((c) => c.id !== oldId));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  // Abgelaufene mobile Meldungen nur clientseitig ausblenden (Daten bleiben
  // in Supabase erhalten, es gibt keinen serverseitigen Aufräum-Job).
  useEffect(() => {
    const prune = () => {
      const cutoff = Date.now() - lifetimeHours * 3600_000;
      setReports((prev) => prev.filter((c) => c.type !== "mobil" || (c.reportedAt ?? 0) >= cutoff));
    };
    const id = setInterval(prune, 60_000);
    return () => clearInterval(id);
  }, [lifetimeHours]);

  const addReport = useCallback(async (lat: number, lng: number, type: CameraType, speedLimit?: number, note?: string) => {
    const { data, error } = await supabase
      .from("camera_reports")
      .insert({ lat, lng, type, speed_limit: speedLimit ?? null, note: note?.trim() || null })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Meldung fehlgeschlagen.");
    const camera = rowToCamera(data as ReportRow);
    setReports((prev) => (prev.some((c) => c.id === camera.id) ? prev : [...prev, camera]));
    return camera;
  }, []);

  const removeReport = useCallback(async (id: string) => {
    setReports((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("camera_reports").delete().eq("id", id);
  }, []);

  const confirmReport = useCallback(async (id: string) => {
    const current = reportsRef.current.find((c) => c.id === id);
    if (!current) return;
    const nextConfirmations = (current.confirmations ?? 1) + 1;
    setReports((prev) =>
      prev.map((c) => (c.id === id ? { ...c, confirmations: nextConfirmations, reportedAt: Date.now() } : c)),
    );
    await supabase
      .from("camera_reports")
      .update({ confirmations: nextConfirmations, created_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  return { reports, addReport, removeReport, confirmReport };
}
