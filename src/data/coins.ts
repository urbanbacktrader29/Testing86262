import type { CoinListing } from "../types";

// Curated universe of well-established, liquid coins that trade against
// USDT on Binance — kept to a manageable list so scans/bot runs stay fast
// and fast (each coin runs one local-model inference per evaluation cycle).
export const COINS: CoinListing[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", binanceSymbol: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", binanceSymbol: "ETHUSDT" },
  { id: "binancecoin", symbol: "BNB", name: "BNB", binanceSymbol: "BNBUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", binanceSymbol: "SOLUSDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", binanceSymbol: "XRPUSDT" },
  { id: "cardano", symbol: "ADA", name: "Cardano", binanceSymbol: "ADAUSDT" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin", binanceSymbol: "DOGEUSDT" },
  { id: "tron", symbol: "TRX", name: "TRON", binanceSymbol: "TRXUSDT" },
  { id: "toncoin", symbol: "TON", name: "Toncoin", binanceSymbol: "TONUSDT" },
  { id: "avalanche", symbol: "AVAX", name: "Avalanche", binanceSymbol: "AVAXUSDT" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot", binanceSymbol: "DOTUSDT" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink", binanceSymbol: "LINKUSDT" },
  { id: "polygon", symbol: "POL", name: "Polygon", binanceSymbol: "POLUSDT" },
  { id: "litecoin", symbol: "LTC", name: "Litecoin", binanceSymbol: "LTCUSDT" },
  { id: "bitcoin-cash", symbol: "BCH", name: "Bitcoin Cash", binanceSymbol: "BCHUSDT" },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", binanceSymbol: "ATOMUSDT" },
  { id: "uniswap", symbol: "UNI", name: "Uniswap", binanceSymbol: "UNIUSDT" },
  { id: "stellar", symbol: "XLM", name: "Stellar", binanceSymbol: "XLMUSDT" },
  { id: "near", symbol: "NEAR", name: "NEAR Protocol", binanceSymbol: "NEARUSDT" },
  { id: "arbitrum", symbol: "ARB", name: "Arbitrum", binanceSymbol: "ARBUSDT" },
  { id: "optimism", symbol: "OP", name: "Optimism", binanceSymbol: "OPUSDT" },
  { id: "injective", symbol: "INJ", name: "Injective", binanceSymbol: "INJUSDT" },
  { id: "sui", symbol: "SUI", name: "Sui", binanceSymbol: "SUIUSDT" },
  { id: "hedera", symbol: "HBAR", name: "Hedera", binanceSymbol: "HBARUSDT" },
  { id: "the-graph", symbol: "GRT", name: "The Graph", binanceSymbol: "GRTUSDT" },
  { id: "aave", symbol: "AAVE", name: "Aave", binanceSymbol: "AAVEUSDT" },
  { id: "shiba-inu", symbol: "SHIB", name: "Shiba Inu", binanceSymbol: "SHIBUSDT" },
  { id: "pepe", symbol: "PEPE", name: "Pepe", binanceSymbol: "PEPEUSDT" },
];

export const COINS_BY_ID: Map<string, CoinListing> = new Map(COINS.map((c) => [c.id, c]));
