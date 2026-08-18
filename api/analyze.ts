import type { VercelRequest, VercelResponse } from "@vercel/node";
import { analyzeWithOpenAI } from "./_lib/openai.ts";
import { supabaseAdmin } from "./_lib/supabaseAdmin.ts";

const MAX_CHARS = 20_000;
const MIN_CHARS = 20;

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const text = (req.body as { text?: unknown } | undefined)?.text;
  if (typeof text !== "string" || text.trim().length < MIN_CHARS) {
    res.status(400).json({ error: "Bitte ein Dokument mit ausreichend Text hochladen." });
    return;
  }
  const trimmed = text.trim().slice(0, MAX_CHARS);

  try {
    const { weaknesses, fullReport } = await analyzeWithOpenAI(trimmed);

    const { data, error } = await supabaseAdmin
      .from("document_analyses")
      .insert({ weaknesses, full_report: fullReport })
      .select("id")
      .single();

    if (error || !data) {
      res.status(500).json({ error: "Analyse konnte nicht gespeichert werden." });
      return;
    }

    res.status(200).json({ id: data.id, weaknesses });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Analyse fehlgeschlagen." });
  }
}
