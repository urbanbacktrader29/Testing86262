// ────────────────────────────────────────────────────────────────────────
// HIER DEINEN ONRAMPER PARTNER-API-KEY EINTRAGEN
//
// 1. Im Onramper Partner-Dashboard (https://dashboard.onramper.com) den
//    "Production API Key" (oder für Tests den "Test API Key") kopieren.
// 2. Lokal in einer Datei ".env.local" (nicht committen!) setzen:
//      VITE_ONRAMPER_API_KEY=pk_prod_xxxxxxxxxxxxxxxxxxxx
// 3. Auf Vercel unter Project Settings → Environment Variables denselben
//    Namen "VITE_ONRAMPER_API_KEY" mit deinem echten Key hinterlegen.
//
// Die Partner-Fee ist bereits in deinem Onramper-Dashboard konfiguriert –
// sobald hier der richtige API-Key steht, werden alle Transaktionen aus
// diesem Widget automatisch deinem Partner-Account zugeordnet.
// ────────────────────────────────────────────────────────────────────────
export const ONRAMPER_API_KEY: string =
  import.meta.env.VITE_ONRAMPER_API_KEY || "YOUR_ONRAMPER_API_KEY";

export const IS_ONRAMPER_KEY_CONFIGURED = ONRAMPER_API_KEY !== "YOUR_ONRAMPER_API_KEY";

// Basis-URL des Onramper Buy-Widgets (siehe docs.onramper.com).
export const ONRAMPER_WIDGET_URL = "https://buy.onramper.com/";

// ── Branding-Platzhalter ───────────────────────────────────────────────
// Namen, Farben und Rechtstexte unten sind Platzhalter – bitte durch
// eure echten Firmendaten ersetzen (siehe auch Impressum/Datenschutz).
export const BRAND = {
  name: "NovaRamp",
  claim: "Krypto kaufen. Einfach. Sicher.",
  supportEmail: "support@example.com",
};

export const SUPPORTED_FIATS = [
  { code: "EUR", label: "EUR — Euro", flag: "🇪🇺" },
  { code: "USD", label: "USD — US-Dollar", flag: "🇺🇸" },
  { code: "GBP", label: "GBP — Britisches Pfund", flag: "🇬🇧" },
  { code: "CHF", label: "CHF — Schweizer Franken", flag: "🇨🇭" },
] as const;

export const SUPPORTED_CRYPTOS = [
  { code: "BTC", label: "Bitcoin (BTC)" },
  { code: "ETH", label: "Ethereum (ETH)" },
  { code: "USDT", label: "Tether (USDT)" },
  { code: "USDC", label: "USD Coin (USDC)" },
  { code: "SOL", label: "Solana (SOL)" },
  { code: "MATIC", label: "Polygon (MATIC)" },
] as const;

export const DEFAULT_AMOUNT = 250;

export type FiatCode = (typeof SUPPORTED_FIATS)[number]["code"];
export type CryptoCode = (typeof SUPPORTED_CRYPTOS)[number]["code"];
