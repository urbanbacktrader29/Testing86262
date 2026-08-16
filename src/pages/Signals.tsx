import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { COINS } from "../data/coins";
import { fetchCoinSignal } from "../services/signal";
import type { CoinListing, TradeSignal } from "../types";
import { formatCurrency } from "../utils/format";
import CoinIcon from "../components/CoinIcon";

interface ScanResult {
  listing: CoinListing;
  signal: TradeSignal;
}

export default function Signals() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    setProgress({ done: 0, total: COINS.length });
    const found: ScanResult[] = [];
    let failures = 0;

    for (const listing of COINS) {
      try {
        const signal = await fetchCoinSignal(listing);
        if (signal && signal.tier !== "unconfirmed") found.push({ listing, signal });
      } catch {
        failures++;
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    found.sort((a, b) => {
      if (a.signal.tier !== b.signal.tier) return a.signal.tier === "strong" ? -1 : 1;
      return b.signal.confidence - a.signal.confidence;
    });
    setResults(found);
    setLastScanAt(Date.now());
    if (failures === COINS.length) setError("Scan fehlgeschlagen — KI-Backend nicht erreichbar. Bitte erneut versuchen.");
    setScanning(false);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Bestätigte Signale</h1>
          <p className="text-slate-500 text-sm mt-1">
            Scannt alle {COINS.length} Coins nacheinander (ein Gemini-Aufruf je Coin) und zeigt nur bestätigte Setups.
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 disabled:opacity-50 text-sm font-medium text-slate-200"
        >
          {scanning ? `Scanne… (${progress.done}/${progress.total})` : "Scan aktualisieren"}
        </button>
      </div>

      {scanning && (
        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
          />
        </div>
      )}

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">{error}</div>}

      {lastScanAt && !scanning && (
        <p className="text-xs text-slate-500 -mt-3">
          Letzter Scan: {new Date(lastScanAt).toLocaleTimeString("de-DE")} · {results.length} bestätigte Signale gefunden
        </p>
      )}

      {!scanning && results.length === 0 && !error ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <p className="text-slate-500">Aktuell kein bestätigtes Signal unter den gescannten Coins.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {results.map(({ listing, signal }) => {
            const isLong = signal.direction === "long";
            const isStrong = signal.tier === "strong";
            return (
              <Link
                key={listing.id}
                to={`/coin/${listing.id}`}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col gap-3 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CoinIcon symbol={listing.symbol} className="w-7 h-7 text-xs" />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100 truncate">{listing.name}</div>
                      <div className="text-xs text-slate-500 uppercase">{listing.symbol}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-sm font-bold ${isLong ? "text-emerald-400" : "text-red-400"}`}>{isLong ? "▲ LONG" : "▼ SHORT"}</span>
                    <span className={`text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded ${isStrong ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                      {isStrong ? "STARK BESTÄTIGT" : "BESTÄTIGT"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-slate-500">Konfidenz</div>
                    <div className="text-slate-200 font-medium">{signal.confidence}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Entry</div>
                    <div className="text-slate-200 font-medium">{formatCurrency(signal.entry)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Perspektiven</div>
                    <div className="text-slate-200 font-medium">
                      {signal.agreeingCount}/{signal.personaCount}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                  <span className="text-red-400">SL {formatCurrency(signal.stopLoss)}</span>
                  <span className="text-emerald-400">TP1 {formatCurrency(signal.takeProfit1.price)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
