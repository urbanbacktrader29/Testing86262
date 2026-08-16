import type { BotTrade, CoinPerformance, ConfirmationTier, MarketRegime } from "../types";
import { BREAKEVEN_WIN_RATE, SL_ATR_MULT } from "../services/signal";

// Laplace smoothing: a coin starts at an assumed neutral 50% win rate worth 3
// "phantom" wins and 3 "phantom" losses, so its influence only moves
// meaningfully once it has built up a real track record.
const PRIOR = 3;

export function smoothedWinRate(wins: number, losses: number): number {
  return (wins + PRIOR) / (wins + losses + PRIOR * 2);
}

// Bounds for capital-at-risk adjustments — deliberately narrow so a small
// sample can never swing position size to an extreme.
const COIN_SIZE_MIN = 0.4;
const COIN_SIZE_MAX = 1.4;

/** Position-size multiplier for a specific coin, from its own win/loss record. */
export function computeCoinSizeMultiplier(wins: number, losses: number): number {
  const winRate = smoothedWinRate(wins, losses);
  const mult = COIN_SIZE_MIN + (COIN_SIZE_MAX - COIN_SIZE_MIN) * winRate;
  return Math.min(COIN_SIZE_MAX, Math.max(COIN_SIZE_MIN, mult));
}

/** Credits or debits a coin's own win/loss record when one of its trades closes. */
export function recordCoinOutcome(performance: CoinPerformance, coinId: string, won: boolean): CoinPerformance {
  const prev = performance[coinId] ?? { wins: 0, losses: 0 };
  return {
    ...performance,
    [coinId]: won ? { wins: prev.wins + 1, losses: prev.losses } : { wins: prev.wins, losses: prev.losses + 1 },
  };
}

const STREAK_TIERS: { losses: number; mult: number }[] = [
  { losses: 5, mult: 0.35 },
  { losses: 3, mult: 0.6 },
];

/**
 * Professional risk management: after a run of consecutive losses (across
 * all coins), cut position size until a win breaks the streak, rather than
 * betting the same size through a stretch of mistakes. Derived fresh from
 * the trade list each time — recovers automatically the moment a trade wins.
 */
export function computeStreakMultiplier(closedTradesChronological: { pnlUsd?: number }[]): number {
  let streak = 0;
  for (let i = closedTradesChronological.length - 1; i >= 0; i--) {
    if ((closedTradesChronological[i].pnlUsd ?? 0) <= 0) streak++;
    else break;
  }
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.losses) return tier.mult;
  }
  return 1.0;
}

export interface CalibrationBucket {
  label: string;
  count: number;
  wins: number;
  actualWinRate: number | null;
}

const CALIBRATION_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "40–50%", min: 40, max: 50 },
  { label: "50–60%", min: 50, max: 60 },
  { label: "60–70%", min: 60, max: 70 },
  { label: "70–80%", min: 70, max: 80 },
  { label: "80%+", min: 80, max: 101 },
];

/**
 * Buckets closed trades by the confidence % the local model stated at entry and
 * checks how often they actually won — i.e. whether "62% Konfidenz" has
 * meant "wins about 62% of the time" in practice.
 */
export function computeCalibration(closedTrades: { signalConfidence: number; pnlUsd?: number }[]): CalibrationBucket[] {
  return CALIBRATION_BUCKETS.map(({ label, min, max }) => {
    const inBucket = closedTrades.filter((t) => t.signalConfidence >= min && t.signalConfidence < max);
    const wins = inBucket.filter((t) => (t.pnlUsd ?? 0) > 0).length;
    return { label, count: inBucket.length, wins, actualWinRate: inBucket.length > 0 ? (wins / inBucket.length) * 100 : null };
  });
}

export const CALIBRATION_MIN_SAMPLES = 8;
export const CALIBRATION_BUFFER_PP = 5;

/**
 * Blocks new entries whose confidence falls into a bucket that has, on the
 * bot's own trade history, proven to lose money on net — the literal "stop
 * repeating the same mistake" behavior. Re-evaluated fresh every time, so a
 * bucket that recovers is unblocked again automatically.
 */
export function isCalibrationBlocked(closedTrades: { signalConfidence: number; pnlUsd?: number }[], confidence: number): boolean {
  const bucket = computeCalibration(closedTrades).find((b) => {
    const spec = CALIBRATION_BUCKETS.find((s) => s.label === b.label)!;
    return confidence >= spec.min && confidence < spec.max;
  });
  if (!bucket || bucket.count < CALIBRATION_MIN_SAMPLES || bucket.actualWinRate === null) return false;
  return bucket.actualWinRate < BREAKEVEN_WIN_RATE - CALIBRATION_BUFFER_PP;
}

/** Win/loss tally for one market regime, pulled straight from the bot's own closed trades. */
export function computeRegimeWinRate(
  closedTrades: { regimeAtEntry: MarketRegime; pnlUsd?: number }[],
  regime: MarketRegime,
): { wins: number; losses: number } {
  const inRegime = closedTrades.filter((t) => t.regimeAtEntry === regime);
  const wins = inRegime.filter((t) => (t.pnlUsd ?? 0) > 0).length;
  return { wins, losses: inRegime.length - wins };
}

export const SL_TIGHTEN_MIN_SAMPLES = 15;
const SL_TIGHTEN_MAX_STEP = 0.4;

/**
 * Tightens the stop-loss distance for a regime that has proven, on the
 * bot's own closed trades, a win rate clearly above breakeven — one-
 * directional by design: a regime doing worse than breakeven never gets a
 * *wider* stop (the streak throttle already handles "this is going badly"
 * by cutting size, not by loosening risk).
 */
export function computeAdaptiveSlMultiplier(wins: number, losses: number): number {
  const total = wins + losses;
  if (total < SL_TIGHTEN_MIN_SAMPLES) return SL_ATR_MULT;
  const winRatePct = smoothedWinRate(wins, losses) * 100;
  const edge = winRatePct - BREAKEVEN_WIN_RATE;
  if (edge <= 0) return SL_ATR_MULT;
  return SL_ATR_MULT - Math.min(SL_TIGHTEN_MAX_STEP, edge * 0.01);
}

export const LEVERAGE_SCALE_MIN = 0.5;

/**
 * A "strong" signal risks less leverage headroom than a merely "confirmed"
 * one by default, and either is scaled down further when the current regime
 * doesn't yet have a track record clearing breakeven. Leverage only ever
 * scales down from what the user configured, never above it.
 */
export function computeLeverageMultiplier(tier: ConfirmationTier, regimeWins: number, regimeLosses: number): number {
  let multiplier = tier === "strong" ? 1.0 : 0.75;
  const total = regimeWins + regimeLosses;
  if (total >= SL_TIGHTEN_MIN_SAMPLES) {
    const winRatePct = smoothedWinRate(regimeWins, regimeLosses) * 100;
    if (winRatePct < BREAKEVEN_WIN_RATE) multiplier *= 0.7;
  }
  return Math.max(LEVERAGE_SCALE_MIN, multiplier);
}

export function closedChronological(trades: BotTrade[]): BotTrade[] {
  return trades.filter((t) => t.status !== "open").sort((a, b) => (a.exitTime ?? 0) - (b.exitTime ?? 0));
}
