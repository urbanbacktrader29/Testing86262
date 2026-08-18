import { useState } from "react";
import FileDropzone from "../components/FileDropzone";
import { PRICE_LABEL, STRIPE_PAYMENT_LINK_URL } from "../config";
import { analyzeDocument } from "../services/api";
import { extractText } from "../services/extractText";
import type { AnalysisResult } from "../types";

type Status = "idle" | "reading" | "analyzing" | "done" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setResult(null);
    setStatus("reading");
    try {
      const text = await extractText(file);
      setStatus("analyzing");
      const analysis = await analyzeDocument(text);
      setResult(analysis);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyse fehlgeschlagen.");
      setStatus("error");
    }
  };

  const busy = status === "reading" || status === "analyzing";
  const checkoutUrl =
    result && STRIPE_PAYMENT_LINK_URL
      ? `${STRIPE_PAYMENT_LINK_URL}${STRIPE_PAYMENT_LINK_URL.includes("?") ? "&" : "?"}client_reference_id=${result.id}`
      : null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Dein Dokument, professionell optimiert</h1>
        <p className="text-slate-400">
          Lade dein Dokument hoch — die KI findet in Sekunden die größten Schwachstellen. Die ersten 3 sind kostenlos.
        </p>
      </div>

      <FileDropzone onFile={handleFile} disabled={busy} fileName={fileName} />

      {busy && (
        <p className="text-center text-sm text-slate-400 animate-pulse">
          {status === "reading" ? "Lese Dokument …" : "KI analysiert dein Dokument …"}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <h2 className="font-semibold text-lg">3 Schwachstellen (kostenlos)</h2>
            <ul className="space-y-3">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-200">
                  <span className="text-rose-400 font-semibold shrink-0">{i + 1}.</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
            <p className="font-semibold text-lg">🔒 Vollständiger Optimierungs-Report</p>
            <p className="text-sm text-slate-400">
              Alle Schwachstellen im Detail, konkrete Formulierungsvorschläge und dein optimiertes Dokument als
              PDF-Download.
            </p>
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                className="inline-block rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                Für {PRICE_LABEL} freischalten
              </a>
            ) : (
              <p className="text-sm text-amber-400">Zahlung aktuell nicht verfügbar (Konfiguration fehlt).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
