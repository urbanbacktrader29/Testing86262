import type { OHLCCandle } from "../types";

const BASE_URL = "https://api.binance.com/api/v3";

class ApiError extends Error {}

// Binance's public market-data endpoints need no API key and allow CORS from
// any origin, with a generous weight-based rate limit (~1200/min per IP). We
// still cache, de-duplicate and throttle to be a good citizen and stay snappy
// on repeat navigation.
const cache = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

const MIN_SPACING_MS = 120;
let nextSlot = 0;

async function throttle(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_SPACING_MS;
  const wait = slot - now;
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

async function fetchWithRetry(url: string, attempt = 0): Promise<Response> {
  await throttle();
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new ApiError("Verbindung zur Binance-API fehlgeschlagen. Bitte Internetverbindung prüfen.");
  }
  // 429 = rate limit warning, 418 = IP briefly blocked after ignoring 429s — both are retryable.
  if ((res.status === 429 || res.status === 418) && attempt < 2) {
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2000 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    return fetchWithRetry(url, attempt + 1);
  }
  return res;
}

async function get<T>(path: string, params: Record<string, string> = {}, ttlMs = 20_000): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const key = url.toString();

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.data as T;
  }

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const res = await fetchWithRetry(key);
    if (!res.ok) {
      if (res.status === 429 || res.status === 418) {
        throw new ApiError("Rate limit erreicht. Bitte kurz warten und erneut versuchen.");
      }
      throw new ApiError(`API-Fehler (${res.status})`);
    }
    const data = (await res.json()) as T;
    cache.set(key, { data, expires: Date.now() + ttlMs });
    return data;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

export interface BinanceTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  count: number;
}

/** 24hr rolling stats for a batch of trading pairs, e.g. ["BTCUSDT","ETHUSDT"]. One call for the whole list. */
export function fetchTickers24hr(symbols: string[]): Promise<BinanceTicker24hr[]> {
  if (symbols.length === 0) return Promise.resolve([]);
  if (symbols.length === 1) {
    return get<BinanceTicker24hr>("/ticker/24hr", { symbol: symbols[0] }, 15_000).then((t) => [t]);
  }
  return get<BinanceTicker24hr[]>("/ticker/24hr", { symbols: JSON.stringify(symbols) }, 15_000);
}

interface RawPrice {
  symbol: string;
  price: string;
}

/**
 * Lightweight last-traded-price lookup, meant for frequent polling — e.g.
 * checking an open position's stop-loss/take-profit every second instead of
 * waiting for a candle to close.
 */
export async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const data =
    symbols.length === 1
      ? [await get<RawPrice>("/ticker/price", { symbol: symbols[0] }, 800)]
      : await get<RawPrice[]>("/ticker/price", { symbols: JSON.stringify(symbols) }, 800);
  const result: Record<string, number> = {};
  for (const { symbol, price } of data) result[symbol] = parseFloat(price);
  return result;
}

export type KlineInterval = "1m" | "3m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "12h" | "1d";

export interface Klines {
  candles: OHLCCandle[];
  volumes: number[];
}

/** Raw kline arrays: [openTime, open, high, low, close, volume, ...]. All numeric fields arrive as strings. */
type RawKline = [number, string, string, string, string, string, ...unknown[]];

export async function fetchKlines(symbol: string, interval: KlineInterval, limit: number): Promise<Klines> {
  const raw = await get<RawKline[]>(
    "/klines",
    { symbol, interval, limit: String(limit) },
    interval === "1m" || interval === "5m" ? 20_000 : 45_000,
  );
  return rawToKlines(raw);
}

function rawToKlines(raw: RawKline[]): Klines {
  const candles: OHLCCandle[] = raw.map((k) => [k[0], parseFloat(k[1]), parseFloat(k[2]), parseFloat(k[3]), parseFloat(k[4])]);
  const volumes: number[] = raw.map((k) => parseFloat(k[5]));
  return { candles, volumes };
}

export { ApiError };
