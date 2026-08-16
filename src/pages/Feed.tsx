import { useEffect, useMemo, useRef, useState } from "react";
import { useBot } from "../hooks/useBot";
import { useWatchlist } from "../hooks/useWatchlist";
import { COINS, COINS_BY_ID } from "../data/coins";
import { fetchCoinSignal } from "../services/signal";
import type { BotTrade, PersonaOpinion, TradeSignal } from "../types";
import { formatCurrency } from "../utils/format";
import CoinIcon from "../components/CoinIcon";

const POLL_INTERVAL_MS = 45_000;
const MAX_ENTRIES = 200;

type FeedEntry =
  | { id: string; time: number; kind: "batch"; signal: TradeSignal }
  | { id: string; time: number; kind: "persona"; persona: PersonaOpinion }
  | { id: string; time: number; kind: "trade"; trade: BotTrade; event: "opened" | "closed" };

function timeLabel(t: number): string {
  return new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function voteBadge(vote: string): { label: string; className: string } {
  if (vote === "long") return { label: "Long", className: "bg-emerald-500/15 text-emerald-300" };
  if (vote === "short") return { label: "Short", className: "bg-red-500/15 text-red-300" };
  return { label: "Neutral", className: "bg-slate-800 text-slate-400" };
}

export default function Feed() {
  const bot = useBot();
  const { watchlist } = useWatchlist();

  const defaultCoinId = bot.state.config?.coinIds[0] ?? watchlist[0] ?? "bitcoin";
  const [coinId, setCoinId] = useState(defaultCoinId);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastPollAt, setLastPollAt] = useState<number | null>(null);
  const seenTradeStatus = useRef<Map<string, BotTrade["status"]>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  const shownCoins = useMemo(() => {
    const priority = new Set([...(bot.state.config?.coinIds ?? []), ...watchlist]);
    return [...COINS].sort((a, b) => Number(priority.has(b.id)) - Number(priority.has(a.id)));
  }, [bot.state.config?.coinIds, watchlist]);

  const listing = COINS_BY_ID.get(coinId);

  useEffect(() => {
    setEntries([]);
    setError(null);
    seenTradeStatus.current = new Map();
    if (!listing) return;

    let cancelled = false;
    const poll = async () => {
      try {
        const signal = await fetchCoinSignal(listing);
        if (cancelled || !signal) return;
        const now = Date.now();
        const batch: FeedEntry = { id: `batch-${now}`, time: now, kind: "batch", signal };
        const personaEntries: FeedEntry[] = signal.personas.map((persona, i) => ({
          id: `persona-${now}-${i}`,
          time: now + i,
          kind: "persona",
          persona,
        }));
        setEntries((prev) => [...prev, batch, ...personaEntries].slice(-MAX_ENTRIES));
        setLastPollAt(now);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Analyse konnte nicht geladen werden — nächster Versuch folgt automatisch.");
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [coinId, listing]);

  useEffect(() => {
    const relevant = bot.state.trades.filter((t) => t.coinId === coinId);
    const newEntries: FeedEntry[] = [];
    for (const trade of relevant) {
      const prevStatus = seenTradeStatus.current.get(trade.id);
      if (prevStatus === undefined) {
        newEntries.push({ id: `trade-open-${trade.id}`, time: trade.entryTime, kind: "trade", trade, event: "opened" });
      }
      if (trade.status !== "open" && prevStatus !== trade.status) {
        newEntries.push({ id: `trade-close-${trade.id}`, time: trade.exitTime ?? Date.now(), kind: "trade", trade, event: "closed" });
      }
      seenTradeStatus.current.set(trade.id, trade.status);
    }
    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries].sort((a, b) => a.time - b.time).slice(-MAX_ENTRIES));
    }
  }, [bot.state.trades, coinId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [entries]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] sm:h-[calc(100vh-9rem)]">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Live-Feed</h1>
        <p className="text-slate-500 text-sm mt-1">Live-Ansicht der Gemini-Flash-Analyse für einen Coin, im Chat-Stil.</p>
      </div>

      <div className="bg-sky-500/10 border border-sky-500/30 text-sky-200 rounded-lg px-4 py-2.5 text-xs leading-relaxed">
        <span className="font-semibold">Wichtig:</span> Jeder Analyse-Zyklus ist ein echter Gemini-Flash-Aufruf, der
        angewiesen wird, mehrere Perspektiven zu simulieren — kein separates Modell pro Perspektive und keine echte
        Kommunikation zwischen ihnen. Aktualisiert alle {POLL_INTERVAL_MS / 1000}s, solange dieser Tab offen ist (jeder
        Zyklus kostet eine echte API-Anfrage).
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {shownCoins.map((c) => (
          <button
            key={c.id}
            onClick={() => setCoinId(c.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm shrink-0 border transition-colors ${
              c.id === coinId ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
            }`}
          >
            <CoinIcon symbol={c.symbol} className="w-4 h-4 text-[8px]" />
            {c.symbol}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-2 text-xs">{error}</div>}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto bg-slate-900/40 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col gap-2">
        {entries.length === 0 && !error && <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Lade erste Analyse…</div>}
        {entries.map((entry) => {
          if (entry.kind === "batch") {
            const s = entry.signal;
            const isNeutral = s.direction === "neutral";
            return (
              <div key={entry.id} className="flex items-center gap-2 my-1.5 text-[11px] text-slate-500">
                <div className="flex-1 h-px bg-slate-800" />
                <span>
                  {timeLabel(entry.time)} · Auswertung {listing?.symbol} ·{" "}
                  <span className={isNeutral ? "text-slate-400" : s.direction === "long" ? "text-emerald-400" : "text-red-400"}>
                    {isNeutral ? "Neutral" : s.direction === "long" ? "Long" : "Short"} {s.confidence}%
                  </span>{" "}
                  · {s.agreeingCount}/{s.personaCount} Perspektiven ·{" "}
                  {s.tier === "strong" ? "stark bestätigt" : s.tier === "confirmed" ? "bestätigt" : "unbestätigt"}
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
            );
          }
          if (entry.kind === "trade") {
            const t = entry.trade;
            const isOpen = entry.event === "opened";
            return (
              <div key={entry.id} className="self-center bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg px-3 py-2 text-xs max-w-[90%]">
                🤖 Bot hat {isOpen ? "Position eröffnet" : "Position geschlossen"}: {t.direction === "long" ? "▲ Long" : "▼ Short"} {t.leverage}x bei{" "}
                {formatCurrency(isOpen ? t.entryPrice : t.exitPrice ?? t.entryPrice)}
                {!isOpen && t.pnlUsd !== undefined && <span className={`font-semibold ${t.pnlUsd >= 0 ? "text-emerald-300" : "text-red-300"}`}> · PnL {formatCurrency(t.pnlUsd)}</span>}
                <span className="text-amber-300/70"> · {timeLabel(entry.time)}</span>
              </div>
            );
          }
          const badge = voteBadge(entry.persona.vote);
          return (
            <div key={entry.id} className="flex items-start gap-2 max-w-[90%]">
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-400 shrink-0 mt-0.5">
                {entry.persona.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl rounded-tl-sm px-3 py-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-medium text-slate-200 text-xs">{entry.persona.name}</span>
                  <span className="text-[10px] text-slate-600">{entry.persona.category}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${badge.className}`}>{badge.label}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">{entry.persona.reasoning}</p>
              </div>
            </div>
          );
        })}
      </div>

      {lastPollAt && (
        <p className="text-[11px] text-slate-600 -mt-1">
          Letzte Aktualisierung: {timeLabel(lastPollAt)} · nächste in bis zu {POLL_INTERVAL_MS / 1000}s
        </p>
      )}
    </div>
  );
}
