import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

// Rohen Request-Body brauchen wir unverändert für die Stripe-Signaturprüfung.
export const config = { api: { bodyParser: false } };

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Backup-Pfad zur Freischaltung: Stripe ruft dies serverseitig auf, sobald
 * eine Zahlung abgeschlossen ist — unabhängig davon, ob Nutzer:innen den
 * Redirect zur Erfolgsseite (api/verify-payment.ts) tatsächlich erreichen.
 * Erfordert einen in Stripe eingerichteten Webhook-Endpunkt (siehe README).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    res.status(500).json({ error: "Stripe ist auf dem Server nicht vollständig konfiguriert." });
    return;
  }

  const stripe = new Stripe(secretKey);
  const signature = req.headers["stripe-signature"];
  const rawBody = await readRawBody(req);

  let event: Stripe.Event;
  try {
    if (typeof signature !== "string") throw new Error("Signatur-Header fehlt.");
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    res.status(400).json({ error: `Webhook-Signatur ungültig: ${err instanceof Error ? err.message : "unbekannt"}` });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const analysisId = session.client_reference_id;
    if (analysisId && session.payment_status === "paid") {
      await supabaseAdmin
        .from("document_analyses")
        .update({ paid: true, stripe_session_id: session.id })
        .eq("id", analysisId);
    }
  }

  res.status(200).json({ received: true });
}
