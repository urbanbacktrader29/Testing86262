/** A coin in our curated universe — maps a display identity to its Binance USDT trading pair. */
export interface CoinListing {
  id: string;
  symbol: string;
  name: string;
  binanceSymbol: string;
}

/** Live market snapshot for one coin, derived from Binance's 24hr ticker. */
export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  high_24h: number;
  low_24h: number;
  volume_24h: number;
  quote_volume_24h: number;
  trades_24h: number;
}

/** [timestamp, open, high, low, close] */
export type OHLCCandle = [number, number, number, number, number];

export type Direction = "long" | "short" | "neutral";

/** Coarse market context: trend-strength above/below threshold. */
export type MarketRegime = "trend" | "range";

/**
 * A compact, purely-computed (no AI involved) snapshot of a coin's current
 * technical state — this is what actually gets sent to the local model,
 * instead of raw candles, to keep prompts small/fast and to guarantee the
 * numbers the model reasons about are real, not something it has to
 * (mis)read off a giant array itself.
 */
export interface MarketSnapshot {
  symbol: string;
  price: number;
  change1h: number;
  change24h: number;
  sma20: number;
  ema12: number;
  ema26: number;
  rsi14: number;
  atr14: number;
  volumeVsAvg: number;
  trend: "up" | "down" | "sideways";
  regime: MarketRegime;
}

/** One named analytical perspective's take, genuinely produced by the LLM — not canned text. */
export interface PersonaOpinion {
  name: string;
  category: string;
  vote: Direction;
  reasoning: string;
}

export type ConfirmationTier = "unconfirmed" | "confirmed" | "strong";

export interface TargetLevel {
  price: number;
  distancePct: number;
}

/**
 * A trading signal for one coin. Direction/confidence/reasoning come from a
 * local in-browser model (see services/localAi.ts); entry/stopLoss/
 * takeProfit are computed deterministically from real ATR — never left to
 * the model to invent, so risk levels stay explainable and reproducible.
 */
export interface TradeSignal {
  direction: Direction;
  confidence: number;
  tier: ConfirmationTier;
  personas: PersonaOpinion[];
  agreeingCount: number;
  personaCount: number;
  summary: string;
  entry: number;
  stopLoss: number;
  takeProfit1: TargetLevel;
  takeProfit2: TargetLevel;
  atr: number;
  regime: MarketRegime;
  generatedAt: number;
}

export interface BotConfig {
  startingCapital: number;
  leverage: number;
  positionSizePct: number;
  maxConcurrentPositions: number;
  coinIds: string[];
}

export type BotTradeStatus = "open" | "closed_tp" | "closed_sl" | "closed_liquidation";

export interface BotTrade {
  id: string;
  coinId: string;
  symbol: string;
  direction: "long" | "short";
  entryPrice: number;
  entryTime: number;
  leverage: number;
  configuredLeverage: number;
  marginUsd: number;
  stopLoss: number;
  takeProfit: number;
  targetLabel: "TP1" | "TP2";
  liquidationPrice: number;
  status: BotTradeStatus;
  exitPrice?: number;
  exitTime?: number;
  pnlUsd?: number;
  pnlPct?: number;
  signalConfidence: number;
  signalTier: ConfirmationTier;
  regimeAtEntry: MarketRegime;
  sizeMultiplier: number;
}

/** Per-coin won/lost tally — some coins simply behave worse under this strategy than others. */
export type CoinPerformance = Record<string, { wins: number; losses: number }>;

export interface BotState {
  active: boolean;
  config: BotConfig | null;
  activatedAt: number | null;
  lastProcessedAt: number | null;
  equity: number;
  trades: BotTrade[];
  coinCooldownUntil: Record<string, number>;
  coinPerformance: CoinPerformance;
  calibrationSkips: number;
}
