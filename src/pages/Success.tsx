import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { downloadPdfUrl, fetchFullReport, verifyPayment } from "../services/api";
import type { FullReport } from "../types";

type Status = "verifying" | "paid" | "error";

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Keine Zahlungsbestätigung gefunden (session_id fehlt in der URL).");
      setStatus("error");
      return;
    }
    (async () => {
      try {
        const { paid, analysisId: id } = await verifyPayment(sessionId);
        if (!paid) throw new Error("Zahlung noch nicht bestätigt. Bitte kurz warten und die Seite neu laden.");
        setAnalysisId(id);
        const full = await fetchFullReport(id);
        setReport(full);
        setStatus("paid");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Zahlung konnte nicht verifiziert werden.");
        setStatus("error");
      }
    })();
  }, [sessionId]);

  if (status === "verifying") {
    return <p className="text-center text-slate-400 animate-pulse">Zahlung wird bestätigt …</p>;
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-3xl">✅</p>
        <h1 className="text-2xl font-bold">Zahlung erfolgreich</h1>
        <p className="text-slate-400 text-sm">Hier ist dein vollständiger Optimierungs-Report.</p>
      </div>

      {analysisId && (
        <div className="text-center">
          <a
            href={downloadPdfUrl(analysisId)}
            className="inline-block rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Optimierten Report als PDF herunterladen
          </a>
        </div>
      )}

      {report && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <h2 className="font-semibold text-lg">Report</h2>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{report.fullReport}</div>
        </div>
      )}
    </div>
  );
}
