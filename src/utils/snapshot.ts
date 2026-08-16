import type { MarketRegime, MarketSnapshot, OHLCCandle } from "../types";
import { atr, ema, rsi, sma } from "./indicators";

const REGIME_ATR_PCT_THRESHOLD = 0.006; // ATR as a fraction of price above which we call it "trend" rather than "range" — a cheap proxy without needing a full ADX.

/**
 * Reduces a candle series down to the handful of real, computed numbers the
 * local model actually reasons over. Keeping this deterministic and separate from
 * the AI call means the price/indicator facts in the prompt are always
 * genuine — the model never has to (mis)read numbers out of a giant array
 * itself, and a bug in a prompt can't silently corrupt the underlying data.
 */
export function buildMarketSnapshot(symbol: string, candles: OHLCCandle[], volumes: number[]): MarketSnapshot | null {
  if (candles.length < 30) return null;

  const closes = candles.map((c) => c[4]);
  const highs = candles.map((c) => c[2]);
  const lows = candles.map((c) => c[3]);
  const price = closes[closes.length - 1];

  const barsPerHour = 12; // 5-minute candles
  const priceOneHourAgo = closes[Math.max(0, closes.length - 1 - barsPerHour)];
  const priceOneDayAgo = closes[Math.max(0, closes.length - 1 - barsPerHour * 24)];

  const sma20 = sma(closes, 20) ?? price;
  const ema12 = ema(closes, 12) ?? price;
  const ema26 = ema(closes, 26) ?? price;
  const rsi14 = rsi(closes, 14) ?? 50;
  const atr14 = atr(highs, lows, closes, 14) ?? price * 0.005;

  const recentVolumes = volumes.slice(-20);
  const avgVolume = recentVolumes.length > 0 ? recentVolumes.reduce((s, v) => s + v, 0) / recentVolumes.length : 0;
  const lastVolume = volumes[volumes.length - 1] ?? 0;
  const volumeVsAvg = avgVolume > 0 ? lastVolume / avgVolume : 1;

  const trend: MarketSnapshot["trend"] = price > sma20 * 1.001 ? "up" : price < sma20 * 0.999 ? "down" : "sideways";
  const regime: MarketRegime = atr14 / price > REGIME_ATR_PCT_THRESHOLD ? "trend" : "range";

  return {
    symbol,
    price,
    change1h: priceOneHourAgo ? ((price - priceOneHourAgo) / priceOneHourAgo) * 100 : 0,
    change24h: priceOneDayAgo ? ((price - priceOneDayAgo) / priceOneDayAgo) * 100 : 0,
    sma20,
    ema12,
    ema26,
    rsi14,
    atr14,
    volumeVsAvg,
    trend,
    regime,
  };
}
