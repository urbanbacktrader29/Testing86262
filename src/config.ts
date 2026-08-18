/**
 * Öffentliche Stripe-Payment-Link-URL — kein Geheimnis, wird direkt im
 * Browser verlinkt. Muss in Vercel als VITE_STRIPE_PAYMENT_LINK_URL gesetzt
 * werden (siehe README). Ohne gesetzten Wert bleibt der Freischalten-Button
 * deaktiviert, statt auf eine kaputte URL zu verlinken.
 */
export const STRIPE_PAYMENT_LINK_URL = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL as string | undefined;

export const PRICE_LABEL = "3,99 €";
