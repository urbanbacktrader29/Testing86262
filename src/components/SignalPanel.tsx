import { useEffect, useState } from "react";
import type { CoinListing, TradeSignal } from "../types";
import { fetchCoinSignal } from "../services/signal";
import { formatCurrency } from "../utils/format";

function voteBadge(vote: string): { label: string; className: string } {
  if (vote === "long") return { label: "Long", className: "bg-emerald-500/15 text-emerald-300" };
  if (vote === "short") return { label: "Short", className: "bg-red-500/15 text-red-300" };
  return { label: "Neutral", className: "bg-slate-800 text-slate-400" };
}

export default function SignalPanel({ listing }: { listing: CoinListing }) {
  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCoinSignal(listing)
      .then((s) => {
        if (!cancelled) setSignal(s);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "KI-Signal konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listing]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-500">KI-Analyse läuft…</div>
    );
  }

  if (error) {
    return <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>;
  }

  if (!signal) return null;

  const isLong = signal.direction === "long";
  const isNeutral = signal.direction === "neutral";
  const tierLabel = signal.tier === "strong" ? "STARK BESTÄTIGT" : signal.tier === "confirmed" ? "BESTÄTIGT" : "UNBESTÄTIGT";

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className={`text-2xl font-bold ${isNeutral ? "text-slate-400" : isLong ? "text-emerald-400" : "text-red-400"}`}>
            {isNeutral ? "◆ NEUTRAL" : isLong ? "▲ LONG" : "▼ SHORT"}
          </span>
          <div className="text-xs text-slate-500 mt-0.5">Konfidenz: {signal.confidence}%</div>
        </div>
        <span
          className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded ${
            signal.tier === "strong" ? "bg-emerald-500/20 text-emerald-300" : signal.tier === "confirmed" ? "bg-slate-800 text-slate-300" : "bg-slate-800 text-slate-500"
          }`}
        >
          {tierLabel} · {signal.agreeingCount}/{signal.personaCount} Perspektiven
        </span>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed">{signal.summary}</p>

      {!isNeutral && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-slate-500">Entry</div>
            <div className="text-slate-200 font-medium">{formatCurrency(signal.entry)}</div>
          </div>
          <div>
            <div className="text-slate-500">Stop-Loss</div>
            <div className="text-red-400 font-medium">{formatCurrency(signal.stopLoss)}</div>
          </div>
          <div>
            <div className="text-slate-500">TP1 / TP2</div>
            <div className="text-emerald-400 font-medium">
              {formatCurrency(signal.takeProfit1.price)} / {formatCurrency(signal.takeProfit2.price)}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
        <div className="text-[11px] uppercase tracking-wide text-slate-500 pt-2">Perspektiven</div>
        {signal.personas.map((p) => {
          const badge = voteBadge(p.vote);
          return (
            <div key={p.name} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-200">{p.name}</span>
                  <span className="text-[10px] text-slate-600">{p.category}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{p.reasoning}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        Diese Perspektiven werden von einem einzelnen, über Groq gehosteten offenen KI-Modell (Llama 3.1 8B)
        simuliert (angewiesen, mehrere Blickwinkel zu berücksichtigen) — keine separaten, unabhängig
        kommunizierenden Modelle. Entry/SL/TP sind fest aus echter ATR-Volatilität berechnet, nicht vom Modell
        geschätzt. Keine Anlageberatung.
      </p>
    </div>
  );
}
