import type { BotConfig, BotState, BotTrade, BotTradeStatus, TradeSignal } from "../types";
import {
  closedChronological,
  computeAdaptiveSlMultiplier,
  computeCoinSizeMultiplier,
  computeLeverageMultiplier,
  computeRegimeWinRate,
  computeStreakMultiplier,
  isCalibrationBlocked,
  recordCoinOutcome,
} from "./learning";

/** Cooldown after closing a position before the same coin can be re-opened. */
export const COOLDOWN_MS = 15 * 60 * 1000;
/** How often (ms) the bot re-evaluates entries per coin. */
export const ENTRY_EVAL_INTERVAL_MS = 15 * 60 * 1000;

const SIZE_MULTIPLIER_MIN = 0.2;
const SIZE_MULTIPLIER_MAX = 1.5;
const MIN_EFFECTIVE_LEVERAGE = 1;

export function createInitialBotState(): BotState {
  return {
    active: false,
    config: null,
    activatedAt: null,
    lastProcessedAt: null,
    equity: 0,
    trades: [],
    coinCooldownUntil: {},
    coinPerformance: {},
    calibrationSkips: 0,
  };
}

function computeLiquidationPrice(entry: number, leverage: number, direction: "long" | "short"): number {
  // Simplified: ignores maintenance margin and fees.
  return direction === "long" ? entry * (1 - 1 / leverage) : entry * (1 + 1 / leverage);
}

function openTrade(
  coinId: string,
  symbol: string,
  signal: TradeSignal,
  config: BotConfig,
  equity: number,
  time: number,
  sizeMultiplier: number,
  leverageMultiplier: number,
  useTp2: boolean,
): BotTrade {
  const direction = signal.direction === "short" ? "short" : "long";
  const leverage = Math.max(MIN_EFFECTIVE_LEVERAGE, config.leverage * leverageMultiplier);
  const clampedSizeMultiplier = Math.min(SIZE_MULTIPLIER_MAX, Math.max(SIZE_MULTIPLIER_MIN, sizeMultiplier));
  const marginUsd = Math.max(0, equity) * (config.positionSizePct / 100) * clampedSizeMultiplier;
  const target = useTp2 ? signal.takeProfit2 : signal.takeProfit1;
  return {
    id: `${coinId}-${time}`,
    coinId,
    symbol,
    direction,
    entryPrice: signal.entry,
    entryTime: time,
    leverage,
    configuredLeverage: config.leverage,
    marginUsd,
    stopLoss: signal.stopLoss,
    takeProfit: target.price,
    targetLabel: useTp2 ? "TP2" : "TP1",
    liquidationPrice: computeLiquidationPrice(signal.entry, leverage, direction),
    status: "open",
    signalConfidence: signal.confidence,
    signalTier: signal.tier,
    regimeAtEntry: signal.regime,
    sizeMultiplier: clampedSizeMultiplier,
  };
}

function resolveStop(trade: BotTrade): { effectiveStop: number; isLiquidation: boolean } {
  const isLong = trade.direction === "long";
  const effectiveStop = isLong ? Math.max(trade.stopLoss, trade.liquidationPrice) : Math.min(trade.stopLoss, trade.liquidationPrice);
  const isLiquidation = effectiveStop === trade.liquidationPrice && trade.liquidationPrice !== trade.stopLoss;
  return { effectiveStop, isLiquidation };
}

function checkLiveExit(trade: BotTrade, price: number): { exitPrice: number; status: BotTradeStatus } | null {
  const isLong = trade.direction === "long";
  const { effectiveStop, isLiquidation } = resolveStop(trade);
  const stopHit = isLong ? price <= effectiveStop : price >= effectiveStop;
  const tpHit = isLong ? price >= trade.takeProfit : price <= trade.takeProfit;

  if (stopHit) return { exitPrice: effectiveStop, status: isLiquidation ? "closed_liquidation" : "closed_sl" };
  if (tpHit) return { exitPrice: trade.takeProfit, status: "closed_tp" };
  return null;
}

function closeTrade(trade: BotTrade, exitPrice: number, status: BotTradeStatus, time: number): BotTrade {
  const isLong = trade.direction === "long";
  const priceChangePct = ((exitPrice - trade.entryPrice) / trade.entryPrice) * (isLong ? 1 : -1);
  const leveredPct = Math.max(priceChangePct * trade.leverage, -1);
  const pnlUsd = trade.marginUsd * leveredPct;
  return { ...trade, status, exitPrice, exitTime: time, pnlUsd, pnlPct: leveredPct * 100 };
}

export interface UnrealizedPnl {
  pnlUsd: number;
  pnlPct: number;
}

export function computeUnrealizedPnl(trade: BotTrade, currentPrice: number): UnrealizedPnl {
  const isLong = trade.direction === "long";
  const priceChangePct = ((currentPrice - trade.entryPrice) / trade.entryPrice) * (isLong ? 1 : -1);
  const leveredPct = Math.max(priceChangePct * trade.leverage, -1);
  return { pnlUsd: trade.marginUsd * leveredPct, pnlPct: leveredPct * 100 };
}

/**
 * Checks every open position against a fresh live price and closes any that
 * have hit their stop-loss/take-profit/liquidation level. Meant to be called
 * on a fast interval (e.g. every second) while the bot is active. Returns
 * the same state reference when nothing changed.
 */
export function checkOpenPositionsLive(state: BotState, livePrices: Record<string, number>): BotState {
  let equity = state.equity;
  let cooldowns = state.coinCooldownUntil;
  let coinPerformance = state.coinPerformance;
  let changed = false;

  const trades = state.trades.map((trade) => {
    if (trade.status !== "open") return trade;
    const price = livePrices[trade.coinId];
    if (price === undefined) return trade;
    const exit = checkLiveExit(trade, price);
    if (!exit) return trade;

    changed = true;
    const closed = closeTrade(trade, exit.exitPrice, exit.status, Date.now());
    const won = (closed.pnlUsd ?? 0) > 0;
    equity += closed.pnlUsd ?? 0;
    cooldowns = { ...cooldowns, [trade.coinId]: Date.now() + COOLDOWN_MS };
    coinPerformance = recordCoinOutcome(coinPerformance, closed.coinId, won);
    return closed;
  });

  if (!changed) return state;
  return { ...state, trades, equity, coinCooldownUntil: cooldowns, coinPerformance };
}

/**
 * Evaluates one coin's freshly-fetched local-AI-backed signal and, if it
 * clears confirmation, calibration, cooldown and position-limit checks,
 * opens a new paper trade sized/leveraged by the bot's adaptive risk rules.
 * Live-only: unlike the previous rule-based version, there is no historical
 * catch-up replay here — an LLM judgment is a live opinion at call time, not
 * a cheap deterministic function that can be re-run identically at any past
 * timestamp, so missed time while the tab was closed is simply not
 * retroactively simulated.
 */
export function evaluateEntry(state: BotState, config: BotConfig, coinId: string, symbol: string, signal: TradeSignal, time: number): BotState {
  if (signal.tier === "unconfirmed") return state;
  if ((state.coinCooldownUntil[coinId] ?? 0) > time) return state;
  if (state.trades.some((t) => t.coinId === coinId && t.status === "open")) return state;
  const openCount = state.trades.filter((t) => t.status === "open").length;
  if (openCount >= config.maxConcurrentPositions) return state;

  const closedSoFar = closedChronological(state.trades);
  if (isCalibrationBlocked(closedSoFar, signal.confidence)) {
    return { ...state, calibrationSkips: state.calibrationSkips + 1 };
  }

  const coinRecord = state.coinPerformance[coinId] ?? { wins: 0, losses: 0 };
  const coinMultiplier = computeCoinSizeMultiplier(coinRecord.wins, coinRecord.losses);
  const streakMultiplier = computeStreakMultiplier(closedSoFar);
  const regimeStats = computeRegimeWinRate(closedSoFar, signal.regime);
  const leverageMultiplier = computeLeverageMultiplier(signal.tier, regimeStats.wins, regimeStats.losses);
  const useTp2 = signal.tier === "strong" && signal.regime === "trend";

  const trade = openTrade(coinId, symbol, signal, config, state.equity, time, coinMultiplier * streakMultiplier, leverageMultiplier, useTp2);
  return { ...state, trades: [...state.trades, trade] };
}

/** Current regime-specific adaptive SL multiplier, for display. */
export function currentAdaptiveSlMultiplier(trades: BotTrade[], regime: "trend" | "range"): number {
  const closed = closedChronological(trades);
  const stats = computeRegimeWinRate(closed, regime);
  return computeAdaptiveSlMultiplier(stats.wins, stats.losses);
}
