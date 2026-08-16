import { useEffect, useMemo, useState } from "react";
import { useBot } from "../hooks/useBot";
import { useWatchlist } from "../hooks/useWatchlist";
import { fetchTickers24hr } from "../api/binance";
import { COINS, COINS_BY_ID } from "../data/coins";
import type { BotConfig, BotState, BotTrade, MarketRegime } from "../types";
import { formatCurrency, formatPercent } from "../utils/format";
import { computeUnrealizedPnl } from "../utils/bot";
import { SL_ATR_MULT, BREAKEVEN_WIN_RATE } from "../services/signal";
import {
  CALIBRATION_BUFFER_PP,
  CALIBRATION_MIN_SAMPLES,
  computeAdaptiveSlMultiplier,
  computeCalibration,
  computeCoinSizeMultiplier,
  computeRegimeWinRate,
  computeStreakMultiplier,
  LEVERAGE_SCALE_MIN,
  SL_TIGHTEN_MIN_SAMPLES,
  smoothedWinRate,
} from "../utils/learning";
import CoinIcon from "../components/CoinIcon";
import StatCard from "../components/StatCard";

const DEFAULT_COIN_IDS = ["bitcoin", "ethereum", "binancecoin", "solana", "ripple"];
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 15, 20];
const POSITION_SIZE_OPTIONS = [5, 10, 15, 20, 25];
const MAX_POSITIONS_OPTIONS = [1, 2, 3, 4, 5, 6, 8];
const MAX_SELECTABLE_COINS = 8;

function formatLeverage(leverage: number): string {
  return Number.isInteger(leverage) ? String(leverage) : leverage.toFixed(1);
}

function statusLabel(status: BotTrade["status"]): { label: string; className: string } {
  switch (status) {
    case "open":
      return { label: "Offen", className: "text-slate-300" };
    case "closed_tp":
      return { label: "Take-Profit", className: "text-emerald-400" };
    case "closed_sl":
      return { label: "Stop-Loss", className: "text-red-400" };
    case "closed_liquidation":
      return { label: "Liquidiert", className: "text-red-500 font-semibold" };
  }
}

function BotSetup({ defaultCoinIds, onActivate }: { defaultCoinIds: string[]; onActivate: (config: BotConfig) => void }) {
  const [startingCapital, setStartingCapital] = useState(10000);
  const [leverage, setLeverage] = useState(5);
  const [positionSizePct, setPositionSizePct] = useState(10);
  const [maxConcurrentPositions, setMaxConcurrentPositions] = useState(3);
  const [coinIds, setCoinIds] = useState<string[]>(defaultCoinIds.slice(0, MAX_SELECTABLE_COINS));

  const toggleCoin = (id: string) => {
    setCoinIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= MAX_SELECTABLE_COINS) return prev;
      return [...prev, id];
    });
  };

  const canActivate = coinIds.length > 0 && startingCapital > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Auto-Trading-Bot</h1>
        <p className="text-slate-500 text-sm mt-1">
          Handelt vollautomatisch anhand eines winzigen, quelloffenen KI-Modells im Backend — einmal aktivieren, läuft danach eigenständig weiter.
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg px-4 py-3 text-sm leading-relaxed">
        <span className="font-semibold">Papier-Trading (simuliert).</span> Der Bot handelt mit virtuellem Kapital — es
        fließt kein echtes Geld. Kurse basieren auf echten Binance-Daten, die Signale kommen von einem winzigen
        quelloffenen KI-Modell (SmolLM2-360M), das serverseitig läuft — kein API-Schlüssel, keine laufenden Kosten,
        aber dadurch auch spürbar weniger zuverlässig als große Sprachmodelle (Begründungen können ungenau oder
        inkonsistent sein — die Kalibrierungs-Sperre unten fängt systematisch überschätzte Konfidenz ab). Anders als
        eine rein regelbasierte Version kann der Bot verpasste Zeit (Tab geschlossen) nicht rückwirkend simulieren —
        er bewertet beim nächsten Zyklus einfach live weiter.
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Startkapital (virtuell)</span>
            <input
              type="number"
              min={100}
              step={100}
              value={startingCapital}
              onChange={(e) => setStartingCapital(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Hebel</span>
            <select
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {LEVERAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}x
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Positionsgröße je Trade</span>
            <select
              value={positionSizePct}
              onChange={(e) => setPositionSizePct(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {POSITION_SIZE_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}% des Kapitals
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Max. gleichzeitige Positionen</span>
            <select
              value={maxConcurrentPositions}
              onChange={(e) => setMaxConcurrentPositions(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              {MAX_POSITIONS_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Beobachtete Coins ({coinIds.length}/{MAX_SELECTABLE_COINS}) — jeder läuft alle 15 Min. lokal durch die KI-Analyse.
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {COINS.map((c) => {
              const checked = coinIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCoin(c.id)}
                  disabled={!checked && coinIds.length >= MAX_SELECTABLE_COINS}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    checked ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <CoinIcon symbol={c.symbol} className="w-5 h-5 text-[9px]" />
                  <span className="truncate">{c.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => onActivate({ startingCapital, leverage, positionSizePct, maxConcurrentPositions, coinIds })}
          disabled={!canActivate}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold transition-colors"
        >
          Bot aktivieren
        </button>
      </div>
    </div>
  );
}

function CoinPerformancePanel({ coinPerformance }: { coinPerformance: BotState["coinPerformance"] }) {
  const ranked = useMemo(() => {
    return Object.entries(coinPerformance)
      .map(([coinId, { wins, losses }]) => {
        const listing = COINS_BY_ID.get(coinId);
        return { coinId, symbol: listing?.symbol ?? coinId, wins, losses, total: wins + losses, multiplier: computeCoinSizeMultiplier(wins, losses) };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.multiplier - a.multiplier);
  }, [coinPerformance]);

  if (ranked.length === 0) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Coin-Performance & Positionsgröße</h2>
      <p className="text-slate-500 text-xs mb-3">
        Coins mit bisher schwacher Trefferquote werden kleiner positioniert, gut laufende etwas größer — automatisch, aus dem eigenen Track-Record je Coin.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        {ranked.map((c) => (
          <div key={c.coinId} className="flex items-center justify-between gap-2 text-sm py-1">
            <div className="flex items-center gap-2 min-w-0">
              <CoinIcon symbol={c.symbol} className="w-5 h-5 text-[9px]" />
              <span className="text-slate-300 truncate">{c.symbol}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500">
                {c.wins}W/{c.losses}L
              </span>
              <span className={`text-xs font-semibold w-12 text-right ${c.multiplier >= 1 ? "text-emerald-400" : "text-red-400"}`}>{c.multiplier.toFixed(2)}x</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const REGIME_LABEL: Record<MarketRegime, string> = { trend: "Trend-Regime", range: "Range-Regime" };

function RiskParametersPanel({ closedTrades }: { closedTrades: BotTrade[] }) {
  const rows = useMemo(() => {
    const regimes: MarketRegime[] = ["trend", "range"];
    return regimes.map((regime) => {
      const stats = computeRegimeWinRate(closedTrades, regime);
      const total = stats.wins + stats.losses;
      return {
        regime,
        total,
        winRatePct: total > 0 ? smoothedWinRate(stats.wins, stats.losses) * 100 : null,
        slMult: computeAdaptiveSlMultiplier(stats.wins, stats.losses),
      };
    });
  }, [closedTrades]);

  if (!rows.some((r) => r.total > 0)) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Adaptive Stop-Loss & Hebel</h2>
      <p className="text-slate-500 text-xs mb-3">
        Stop-Loss (Basis {SL_ATR_MULT}x ATR) wird je Regime enger gestellt, sobald ab {SL_TIGHTEN_MIN_SAMPLES} eigenen
        Trades die Trefferquote klar über der nötigen ~{BREAKEVEN_WIN_RATE.toFixed(0)}%-Schwelle liegt — nie weiter,
        auch nicht nach Verlusten. Hebel wird je Signalstärke und Regime-Track-Record bis auf{" "}
        {(LEVERAGE_SCALE_MIN * 100).toFixed(0)}% deines eingestellten Hebels reduziert — nie darüber.
      </p>
      <div className="flex flex-col">
        {rows.map((r) => (
          <div key={r.regime} className="flex items-center justify-between text-sm py-1.5 border-t border-slate-800 first:border-t-0 first:pt-0">
            <span className="text-slate-300">{REGIME_LABEL[r.regime]}</span>
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="text-slate-500">
                {r.total} Trades{r.winRatePct !== null ? ` · ${r.winRatePct.toFixed(0)}% WR` : ""}
              </span>
              <span className={`font-semibold ${r.slMult < SL_ATR_MULT ? "text-emerald-400" : "text-slate-500"}`}>SL {r.slMult.toFixed(2)}x ATR</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskThrottleBanner({ closedTradesChronological }: { closedTradesChronological: BotTrade[] }) {
  const multiplier = useMemo(() => computeStreakMultiplier(closedTradesChronological), [closedTradesChronological]);
  if (multiplier >= 1) return null;

  let streak = 0;
  for (let i = closedTradesChronological.length - 1; i >= 0; i--) {
    if ((closedTradesChronological[i].pnlUsd ?? 0) <= 0) streak++;
    else break;
  }

  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-2.5 text-xs leading-relaxed">
      <span className="font-semibold">Risiko-Drosselung aktiv:</span> {streak} Verluste in Folge — neue Positionen werden
      aktuell nur mit {(multiplier * 100).toFixed(0)}% der normalen Größe eröffnet, bis wieder ein Trade gewinnt.
    </div>
  );
}

function CalibrationPanel({ closedTrades, calibrationSkips }: { closedTrades: BotTrade[]; calibrationSkips: number }) {
  const buckets = useMemo(() => computeCalibration(closedTrades.map((t) => ({ signalConfidence: t.signalConfidence, pnlUsd: t.pnlUsd }))), [closedTrades]);
  const hasAny = buckets.some((b) => b.count > 0);
  if (!hasAny) return null;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-1">Konfidenz-Kalibrierung</h2>
      <p className="text-slate-500 text-xs mb-3">
        Stimmt die von der lokalen KI angegebene Konfidenz mit der tatsächlichen Trefferquote überein? Ab {CALIBRATION_MIN_SAMPLES} Trades pro
        Bereich blockiert der Bot neue Signale in einem Bereich, dessen Trefferquote spürbar (&gt;{CALIBRATION_BUFFER_PP} Prozentpunkte)
        unter der nötigen Gewinnschwelle von ~{BREAKEVEN_WIN_RATE.toFixed(0)}% liegt.
      </p>
      <div className="flex flex-col gap-1.5">
        {buckets.map((b) => {
          const blocked = b.count >= CALIBRATION_MIN_SAMPLES && b.actualWinRate !== null && b.actualWinRate < BREAKEVEN_WIN_RATE - CALIBRATION_BUFFER_PP;
          return (
            <div key={b.label} className="flex items-center gap-3 text-sm">
              <span className="text-slate-400 w-16 shrink-0">{b.label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                {b.actualWinRate !== null && (
                  <div className={`h-full ${blocked ? "bg-red-500" : b.actualWinRate >= 50 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, b.actualWinRate)}%` }} />
                )}
              </div>
              <span className="text-xs text-slate-500 w-12 text-right shrink-0">{b.count < 5 ? "zu wenig" : b.actualWinRate !== null ? `${b.actualWinRate.toFixed(0)}%` : "–"}</span>
              <span className="text-[11px] text-slate-600 w-16 text-right shrink-0">{b.count} Trades</span>
              {blocked && <span className="text-[10px] font-semibold text-red-400 shrink-0">gesperrt</span>}
            </div>
          );
        })}
      </div>
      {calibrationSkips > 0 && (
        <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800">
          {calibrationSkips} Signal{calibrationSkips === 1 ? "" : "e"} wegen schwacher historischer Trefferquote übersprungen.
        </p>
      )}
    </div>
  );
}

function BotDashboard({
  state,
  evaluating,
  evalError,
  deactivate: onDeactivate,
  resume: onResume,
  onReset,
}: ReturnType<typeof useBot> & { onReset: () => void }) {
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const config = state.config!;

  const openTrades = useMemo(() => state.trades.filter((t) => t.status === "open"), [state.trades]);
  const closedTrades = useMemo(() => state.trades.filter((t) => t.status !== "open").sort((a, b) => (b.exitTime ?? 0) - (a.exitTime ?? 0)), [state.trades]);
  const closedTradesChronological = useMemo(() => [...closedTrades].reverse(), [closedTrades]);

  useEffect(() => {
    if (openTrades.length === 0) return;
    let cancelled = false;
    const symbols = Array.from(new Set(openTrades.map((t) => COINS_BY_ID.get(t.coinId)?.binanceSymbol).filter((s): s is string => !!s)));
    const load = () => {
      fetchTickers24hr(symbols)
        .then((tickers) => {
          if (cancelled) return;
          const bySymbol = new Map(tickers.map((t) => [t.symbol, parseFloat(t.lastPrice)]));
          const next: Record<string, number> = {};
          for (const trade of openTrades) {
            const listing = COINS_BY_ID.get(trade.coinId);
            const price = listing && bySymbol.get(listing.binanceSymbol);
            if (price) next[trade.coinId] = price;
          }
          setLivePrices(next);
        })
        .catch(() => undefined);
    };
    load();
    const interval = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [openTrades]);

  const unrealizedTotal = useMemo(
    () => openTrades.reduce((sum, t) => sum + computeUnrealizedPnl(t, livePrices[t.coinId] ?? t.entryPrice).pnlUsd, 0),
    [openTrades, livePrices],
  );

  const currentEquity = state.equity + unrealizedTotal;
  const totalReturnPct = config.startingCapital > 0 ? ((currentEquity - config.startingCapital) / config.startingCapital) * 100 : 0;
  const wins = closedTrades.filter((t) => (t.pnlUsd ?? 0) > 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : null;
  const realizedPnl = state.equity - config.startingCapital;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Auto-Trading-Bot</h1>
          <p className="text-slate-500 text-sm mt-1">
            {state.active ? "Aktiv — läuft eigenständig weiter" : "Pausiert"} · {config.coinIds.length} Coins · {config.leverage}x Hebel
          </p>
        </div>
        <div className="flex gap-2">
          {state.active ? (
            <button onClick={onDeactivate} className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium">
              Pausieren
            </button>
          ) : (
            <button onClick={onResume} className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-sm font-medium">
              Fortsetzen
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Bot-Verlauf wirklich zurücksetzen? Alle Trades und PnL gehen verloren.")) onReset();
            }}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-sm font-medium"
          >
            Zurücksetzen
          </button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg px-4 py-2.5 text-xs leading-relaxed">
        <span className="font-semibold">Papier-Trading (simuliert)</span> — virtuelles Kapital, Signale von einem winzigen quelloffenen KI-Modell (serverseitig, kein API-Schlüssel).
      </div>

      <RiskThrottleBanner closedTradesChronological={closedTradesChronological} />

      {evaluating && <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">Bot bewertet aktuelle Signale…</div>}
      {evalError && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">{evalError}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Kontostand" value={formatCurrency(currentEquity)} />
        <StatCard label="Gesamt-PnL" value={`${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%`} change={formatCurrency(currentEquity - config.startingCapital)} positive={totalReturnPct >= 0} />
        <StatCard label="Winrate" value={winRate !== null ? `${winRate.toFixed(0)}%` : "–"} change={`${wins}/${closedTrades.length} Trades`} positive={winRate === null || winRate >= 50} />
        <StatCard label="Offene Positionen" value={`${openTrades.length}/${config.maxConcurrentPositions}`} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Offene Positionen</h2>
        {openTrades.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center bg-slate-900/40 border border-slate-800 rounded-xl">Keine offenen Positionen — der Bot wartet auf ein bestätigtes Signal.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900/60">
                  <th className="px-3 py-2.5 text-left">Coin</th>
                  <th className="px-3 py-2.5 text-left">Richtung</th>
                  <th className="px-3 py-2.5 text-right">Entry</th>
                  <th className="px-3 py-2.5 text-right">Aktuell</th>
                  <th className="px-3 py-2.5 text-right">SL</th>
                  <th className="px-3 py-2.5 text-right">TP</th>
                  <th className="px-3 py-2.5 text-right">PnL</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map((t) => {
                  const price = livePrices[t.coinId] ?? t.entryPrice;
                  const { pnlUsd, pnlPct } = computeUnrealizedPnl(t, price);
                  return (
                    <tr key={t.id} className="border-b border-slate-800/60 last:border-0">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <CoinIcon symbol={t.symbol} className="w-5 h-5 text-[9px]" />
                          <span className="font-medium text-slate-100">{t.symbol}</span>
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 font-medium ${t.direction === "long" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.direction === "long" ? "▲ Long" : "▼ Short"} {formatLeverage(t.leverage)}x
                        {t.leverage < t.configuredLeverage - 0.01 && <div className="text-[10px] text-amber-500 font-normal">von {t.configuredLeverage}x</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {formatCurrency(t.entryPrice)}
                        {t.sizeMultiplier < 1 && <div className="text-[10px] text-amber-500">{(t.sizeMultiplier * 100).toFixed(0)}% Größe</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-100">{formatCurrency(price)}</td>
                      <td className="px-3 py-2.5 text-right text-red-400">{formatCurrency(t.stopLoss)}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-400">
                        {formatCurrency(t.takeProfit)}
                        <div className="text-[10px] text-slate-600">{t.targetLabel}</div>
                      </td>
                      <td className={`px-3 py-2.5 text-right font-medium ${pnlUsd >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(pnlUsd)}
                        <div className="text-[11px] text-slate-500">{formatPercent(pnlPct)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">
          Trade-Verlauf ({closedTrades.length}) {realizedPnl !== 0 && <span className="text-slate-500 font-normal">· realisiert {formatCurrency(realizedPnl)}</span>}
        </h2>
        {closedTrades.length === 0 ? (
          <p className="text-slate-500 text-sm py-6 text-center bg-slate-900/40 border border-slate-800 rounded-xl">Noch keine abgeschlossenen Trades.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="text-slate-500 text-xs uppercase tracking-wide border-b border-slate-800 bg-slate-900">
                  <th className="px-3 py-2.5 text-left">Coin</th>
                  <th className="px-3 py-2.5 text-left">Richtung</th>
                  <th className="px-3 py-2.5 text-right">Entry → Exit</th>
                  <th className="px-3 py-2.5 text-left">Ergebnis</th>
                  <th className="px-3 py-2.5 text-right">PnL</th>
                  <th className="px-3 py-2.5 text-right">Geschlossen</th>
                </tr>
              </thead>
              <tbody>
                {closedTrades.map((t) => {
                  const status = statusLabel(t.status);
                  return (
                    <tr key={t.id} className="border-b border-slate-800/60 last:border-0 bg-slate-900/40">
                      <td className="px-3 py-2.5 font-medium text-slate-100">{t.symbol}</td>
                      <td className={`px-3 py-2.5 ${t.direction === "long" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.direction === "long" ? "▲ Long" : "▼ Short"} {formatLeverage(t.leverage)}x
                        {t.leverage < t.configuredLeverage - 0.01 && <div className="text-[10px] text-amber-500 font-normal">von {t.configuredLeverage}x</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-300">
                        {formatCurrency(t.entryPrice)} → {formatCurrency(t.exitPrice ?? 0)}
                        <div className="text-[10px] text-slate-600">
                          {t.targetLabel}
                          {t.sizeMultiplier < 1 && <span className="text-amber-500"> · {(t.sizeMultiplier * 100).toFixed(0)}% Größe</span>}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 ${status.className}`}>{status.label}</td>
                      <td className={`px-3 py-2.5 text-right font-medium ${(t.pnlUsd ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatCurrency(t.pnlUsd ?? 0)}
                        <div className="text-[11px] text-slate-500">{formatPercent(t.pnlPct)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-500 text-xs">
                        {t.exitTime ? new Date(t.exitTime).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "–"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CoinPerformancePanel coinPerformance={state.coinPerformance} />
      <RiskParametersPanel closedTrades={closedTrades} />
      <CalibrationPanel closedTrades={closedTrades} calibrationSkips={state.calibrationSkips} />

      <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        Regelbasierte Risiko-Engine um ein winziges, quelloffenes KI-Modell (SmolLM2-360M, serverseitig, kein
        API-Schlüssel) herum, simuliert. Der Bot eröffnet automatisch eine Position, sobald ein Coin aus deiner
        Beobachtungsliste ein bestätigtes KI-Signal erreicht (alle 15 Minuten neu bewertet), und schließt sie bei
        Erreichen von Take-Profit oder Stop-Loss (sekündlich gegen den Live-Preis geprüft, solange diese Seite
        geöffnet ist). Entry/SL/TP sind fest aus echter ATR-Volatilität berechnet, nie vom Modell geschätzt. Verpasste
        Zeit (Tab geschlossen) wird nicht rückwirkend simuliert — anders als eine rein regelbasierte Version kann ein
        LLM-Urteil nicht günstig und deterministisch für die Vergangenheit neu berechnet werden. Das Modell ist
        bewusst winzig gewählt, um ohne API-Schlüssel und ohne laufende Kosten auszukommen — das macht die
        Einzelanalyse spürbar unzuverlässiger als bei großen Sprachmodellen; die Kalibrierungs-Sperre unten ist hier
        entsprechend wichtiger als bloße Dekoration. Lernen
        wirkt auf: Positionsgröße je Coin, Verlustserien-Drosselung, Konfidenz-Kalibrierungs-Sperre, sowie Stop-Loss
        (nur enger, nie weiter) und Hebel (nur niedriger, nie höher als eingestellt). Liquidation wird vereinfacht als
        Kapitalverlust der Positions-Margin berechnet (ohne Gebühren/Funding). Keine Anlageberatung, keine Gewinngarantie.
      </div>
    </div>
  );
}

export default function Bot() {
  const bot = useBot();
  const { watchlist } = useWatchlist();

  if (!bot.state.config) {
    const defaults = watchlist.length > 0 ? watchlist : DEFAULT_COIN_IDS;
    return <BotSetup defaultCoinIds={defaults} onActivate={bot.activate} />;
  }

  return <BotDashboard {...bot} onReset={bot.reset} />;
}
