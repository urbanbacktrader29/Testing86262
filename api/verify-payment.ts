import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

/**
 * Wird von der Erfolgsseite direkt nach der Stripe-Weiterleitung aufgerufen
 * (mit der Checkout-Session-ID aus der Redirect-URL). Prüft die Zahlung
 * live bei Stripe — unabhängig vom Webhook, damit die Freischaltung nicht
 * von dessen Zustellung abhängt. Der Webhook (api/stripe-webhook.ts) ist
 * das zusätzliche, verlässlichere Backup, falls Nutzer:innen den Tab vor
 * der Weiterleitung schließen.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sessionId = req.query.session_id;
  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "session_id fehlt." });
    return;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "STRIPE_SECRET_KEY ist auf dem Server nicht gesetzt." });
    return;
  }

  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.status(200).json({ paid: false });
      return;
    }

    const analysisId = session.client_reference_id;
    if (!analysisId) {
      res.status(400).json({ error: "Zahlung ohne zugeordnete Analyse (client_reference_id fehlt)." });
      return;
    }

    await supabaseAdmin
      .from("document_analyses")
      .update({ paid: true, stripe_session_id: session.id })
      .eq("id", analysisId);

    res.status(200).json({ paid: true, analysisId });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Zahlung konnte nicht geprüft werden." });
  }
}
