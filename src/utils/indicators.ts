/** Simple moving average of the last `period` closes; null while there isn't enough history yet. */
export function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(values.length - period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

/** Exponential moving average over the full series, seeded with a plain SMA of the first `period` values. */
export function emaSeries(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return result;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  result[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result[i] = prev;
  }
  return result;
}

export function ema(values: number[], period: number): number | null {
  const series = emaSeries(values, period);
  return series[series.length - 1];
}

/** Wilder's RSI — momentum oscillator, 0-100, >70 overbought / <30 oversold by convention. */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Average True Range — volatility measure in price units, used to size stop-loss/take-profit distances. */
export function atr(high: number[], low: number[], close: number[], period = 14): number | null {
  if (close.length < period + 1) return null;
  const trueRanges: number[] = [];
  for (let i = 1; i < close.length; i++) {
    const tr = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    trueRanges.push(tr);
  }
  const relevant = trueRanges.slice(trueRanges.length - period);
  return relevant.reduce((sum, v) => sum + v, 0) / period;
}
