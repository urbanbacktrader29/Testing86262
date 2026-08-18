import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const id = req.query.id;
  if (!id || typeof id !== "string") {
    res.status(400).json({ error: "id fehlt." });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("document_analyses")
    .select("weaknesses, full_report, paid")
    .eq("id", id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Analyse nicht gefunden." });
    return;
  }
  if (!data.paid) {
    res.status(402).json({ error: "Zahlung erforderlich." });
    return;
  }

  res.status(200).json({ weaknesses: data.weaknesses, fullReport: data.full_report });
}
