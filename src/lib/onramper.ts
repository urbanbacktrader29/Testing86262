import { ONRAMPER_API_KEY, ONRAMPER_WIDGET_URL } from "./config";

export interface OnramperParams {
  fiat: string;
  crypto: string;
  amount: number;
  walletAddress: string;
  darkMode?: boolean;
}

/**
 * Baut die Embed-URL für das offizielle Onramper Buy-Widget.
 *
 * Referenz: https://docs.onramper.com/docs/supported-widget-parameters
 * Wichtig: Onramper kann die unterstützten Query-Parameter ändern bzw.
 * verlangt für Produktivbetrieb ggf. signierte URLs (Widget V2, siehe
 * https://docs.onramper.com/docs/widget-sign-a-url-v2). Vor Live-Schaltung
 * die aktuelle Doku prüfen.
 */
export function buildOnramperUrl({
  fiat,
  crypto,
  amount,
  walletAddress,
  darkMode = true,
}: OnramperParams): string {
  const params = new URLSearchParams({
    apiKey: ONRAMPER_API_KEY,
    defaultFiat: fiat,
    defaultCrypto: crypto,
    defaultAmount: String(amount),
    isAddressEditable: walletAddress ? "false" : "true",
    darkMode: String(darkMode),
  });

  if (walletAddress) {
    // Format: TOKEN:adresse, mehrere per Komma trennbar, z.B. "BTC:bc1...,ETH:0x..."
    params.set("wallets", `${crypto}:${walletAddress}`);
  }

  return `${ONRAMPER_WIDGET_URL}?${params.toString()}`;
}

/** Sehr grobe Plausibilitätsprüfung — ersetzt keine echte Adressvalidierung pro Chain. */
export function looksLikeWalletAddress(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 20 && trimmed.length <= 100 && /^[a-zA-Z0-9:]+$/.test(trimmed);
}
