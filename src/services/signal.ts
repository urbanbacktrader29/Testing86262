import { fetchKlines } from "../api/binance";
import { buildMarketSnapshot } from "../utils/snapshot";
import { runPersonaAnalysis } from "./localAi";
import type { CoinListing, ConfirmationTier, TradeSignal } from "../types";

export const SIGNAL_INTERVAL = "5m" as const;
export const SIGNAL_CANDLES = 120; // 10h of 5-min candles — enough for SMA20/EMA26/RSI14/ATR14 to settle.

// Fixed, deterministic risk shape — never left to the model. SL is wider than
// TP1 (1.5:1), so a TP1-only strategy needs roughly a 60% win rate just to
// break even; that number is what the confidence-calibration gate compares
// the AI's stated confidence against.
export const SL_ATR_MULT = 1.5;
export const TP1_ATR_MULT = 1.0;
export const TP2_ATR_MULT = 3.0;
export const BREAKEVEN_WIN_RATE = (SL_ATR_MULT / (SL_ATR_MULT + TP1_ATR_MULT)) * 100;

function deriveTier(direction: string, confidence: number, agreeingCount: number, personaCount: number): ConfirmationTier {
  if (direction === "neutral") return "unconfirmed";
  const agreementRatio = personaCount > 0 ? agreeingCount / personaCount : 0;
  if (confidence >= 65 && agreementRatio >= 0.8) return "strong";
  if (confidence >= 45 && agreementRatio >= 0.6) return "confirmed";
  return "unconfirmed";
}

/**
 * Fetches real candles, computes a deterministic market snapshot, runs it
 * through the local in-browser model (see services/localAi.ts) for the
 * actual directional judgment, and combines that with ATR-based (not
 * AI-guessed) entry/SL/TP levels. Returns null if there isn't enough candle
 * history yet.
 */
export async function fetchCoinSignal(listing: CoinListing): Promise<TradeSignal | null> {
  const { candles, volumes } = await fetchKlines(listing.binanceSymbol, SIGNAL_INTERVAL, SIGNAL_CANDLES);
  const snapshot = buildMarketSnapshot(listing.symbol, candles, volumes);
  if (!snapshot) return null;

  const ai = await runPersonaAnalysis(snapshot);

  const agreeingCount = ai.personas.filter((p) => p.vote === ai.direction).length;
  const tier = deriveTier(ai.direction, ai.confidence, agreeingCount, ai.personas.length);

  const entry = snapshot.price;
  const riskDistance = SL_ATR_MULT * snapshot.atr14;
  const tp1Distance = TP1_ATR_MULT * snapshot.atr14;
  const tp2Distance = TP2_ATR_MULT * snapshot.atr14;
  const isLong = ai.direction === "long";

  const stopLoss = ai.direction === "neutral" ? entry : isLong ? entry - riskDistance : entry + riskDistance;
  const tp1Price = ai.direction === "neutral" ? entry : isLong ? entry + tp1Distance : entry - tp1Distance;
  const tp2Price = ai.direction === "neutral" ? entry : isLong ? entry + tp2Distance : entry - tp2Distance;

  return {
    direction: ai.direction,
    confidence: Math.round(ai.confidence),
    tier,
    personas: ai.personas,
    agreeingCount,
    personaCount: ai.personas.length,
    summary: ai.summary,
    entry,
    stopLoss,
    takeProfit1: { price: tp1Price, distancePct: entry ? (Math.abs(tp1Price - entry) / entry) * 100 : 0 },
    takeProfit2: { price: tp2Price, distancePct: entry ? (Math.abs(tp2Price - entry) / entry) * 100 : 0 },
    atr: snapshot.atr14,
    regime: snapshot.regime,
    generatedAt: Date.now(),
  };
}
