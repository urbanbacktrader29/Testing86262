import { useCallback, useEffect, useRef, useState } from "react";
import type { BotConfig, BotState } from "../types";
import { fetchLivePrices } from "../api/binance";
import { COINS_BY_ID } from "../data/coins";
import { fetchCoinSignal } from "../services/signal";
import { checkOpenPositionsLive, createInitialBotState, ENTRY_EVAL_INTERVAL_MS, evaluateEntry } from "../utils/bot";

const STORAGE_KEY = "krypto-bot-state-v2";
const LIVE_PRICE_POLL_MS = 1_000;

function loadState(): BotState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialBotState();
    return { ...createInitialBotState(), ...(JSON.parse(raw) as BotState) };
  } catch {
    return createInitialBotState();
  }
}

function saveState(state: BotState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useBot() {
  const [state, setState] = useState<BotState>(() => loadState());
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const evaluatingRef = useRef(false);
  const lastEvalByCoin = useRef<Record<string, number>>({});

  const evaluateEntries = useCallback(async () => {
    const current = stateRef.current;
    if (!current.active || !current.config || evaluatingRef.current) return;
    evaluatingRef.current = true;
    setEvaluating(true);
    setEvalError(null);
    const now = Date.now();
    let anyFailed = false;

    try {
      const dueCoins = current.config.coinIds.filter((coinId) => {
        const last = lastEvalByCoin.current[coinId] ?? 0;
        return now - last >= ENTRY_EVAL_INTERVAL_MS;
      });

      for (const coinId of dueCoins) {
        const listing = COINS_BY_ID.get(coinId);
        if (!listing) continue;
        lastEvalByCoin.current[coinId] = now;
        try {
          const signal = await fetchCoinSignal(listing);
          if (!signal) continue;
          setState((prev) => {
            const next = evaluateEntry(prev, prev.config!, coinId, listing.symbol, signal, Date.now());
            if (next !== prev) saveState(next);
            return next;
          });
        } catch (err) {
          anyFailed = true;
          console.error(`Signal-Fehler für ${listing.symbol}:`, err);
        }
      }
      if (anyFailed) setEvalError("Für mindestens einen Coin konnte kein KI-Signal geladen werden. Nächster Versuch folgt automatisch.");
    } finally {
      setState((prev) => {
        const next = { ...prev, lastProcessedAt: Date.now() };
        saveState(next);
        return next;
      });
      evaluatingRef.current = false;
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    if (!state.active) return;
    evaluateEntries();
    const interval = setInterval(evaluateEntries, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active]);

  const livePollingRef = useRef(false);
  useEffect(() => {
    if (!state.active) return;
    const tick = async () => {
      const current = stateRef.current;
      const openTrades = current.trades.filter((t) => t.status === "open");
      if (openTrades.length === 0 || livePollingRef.current) return;
      livePollingRef.current = true;
      try {
        const symbols = Array.from(
          new Set(openTrades.map((t) => COINS_BY_ID.get(t.coinId)?.binanceSymbol).filter((s): s is string => !!s)),
        );
        const prices = await fetchLivePrices(symbols);
        const priceByCoinId: Record<string, number> = {};
        for (const t of openTrades) {
          const listing = COINS_BY_ID.get(t.coinId);
          if (listing && prices[listing.binanceSymbol] !== undefined) priceByCoinId[t.coinId] = prices[listing.binanceSymbol];
        }
        const next = checkOpenPositionsLive(current, priceByCoinId);
        if (next !== current) {
          setState(next);
          saveState(next);
        }
      } catch {
        // Transient errors here are silently skipped — next tick catches up.
      } finally {
        livePollingRef.current = false;
      }
    };
    const interval = setInterval(tick, LIVE_PRICE_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active]);

  const activate = useCallback((config: BotConfig) => {
    const now = Date.now();
    lastEvalByCoin.current = {};
    const next: BotState = {
      active: true,
      config,
      activatedAt: now,
      lastProcessedAt: now,
      coinPerformance: {},
      calibrationSkips: 0,
      equity: config.startingCapital,
      trades: [],
      coinCooldownUntil: {},
    };
    setState(next);
    saveState(next);
  }, []);

  const deactivate = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, active: false };
      saveState(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (!prev.config) return prev;
      const next = { ...prev, active: true };
      saveState(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = createInitialBotState();
    lastEvalByCoin.current = {};
    setState(next);
    saveState(next);
  }, []);

  return { state, evaluating, evalError, activate, deactivate, resume, reset };
}
