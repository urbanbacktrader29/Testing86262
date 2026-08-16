// Deployed as a Vercel Edge Function (see `config` below), deliberately —
// not a standard Node.js serverless function. @huggingface/transformers'
// package.json exports a Node build that unconditionally imports
// `onnxruntime-node`, a >500MB native-binary package, which is far too
// large to ship in a serverless function bundle. Its non-Node build
// (resolved automatically by any bundler that isn't targeting Node, which
// includes Vercel's Edge runtime) is pure WASM instead — that's the build
// this file actually needs, and Edge is what gets it.
export const config = { runtime: "edge" };

import { pipeline, type TextGenerationPipeline } from "@huggingface/transformers";
import type { MarketSnapshot } from "../src/types.ts";

// A deliberately tiny (360M parameter) instruction-tuned model — the
// tradeoff explicitly requested: zero API key and zero external account,
// running on ordinary CPU/WASM inside a serverless function instead of a
// paid inference API or the user's own browser (which turned out to be too
// heavy for their device). Expect noticeably weaker, less reliable
// reasoning than a hosted multi-billion-parameter model — the calibration
// gate and other risk controls downstream matter more with this model, not
// less.
const MODEL_ID = "onnx-community/SmolLM2-360M-Instruct";

let generatorPromise: Promise<TextGenerationPipeline> | null = null;
function getGenerator(): Promise<TextGenerationPipeline> {
  if (!generatorPromise) {
    generatorPromise = pipeline("text-generation", MODEL_ID, { dtype: "q8" }) as Promise<TextGenerationPipeline>;
  }
  return generatorPromise;
}

const PERSONAS = [
  { name: "Trend-Analyst", category: "Trend", focus: "Preis relativ zu SMA(20)/EMA(12/26)" },
  { name: "Momentum-Analyst", category: "Momentum", focus: "RSI(14) und EMA-Crossover" },
  { name: "Volatilitäts-Analyst", category: "Volatilität", focus: "ATR(14) relativ zum Preis und das Markt-Regime" },
  { name: "Volumen-Analyst", category: "Volumen", focus: "Volumen im Verhältnis zum 20-Kerzen-Durchschnitt" },
  { name: "Kontra-Stimme", category: "Risiko", focus: "Gründe, warum die anderen vier falsch liegen könnten" },
];

// Kept deliberately short — a 360M model loses coherence fast on long,
// multi-part instructions, and every extra requested token is CPU/WASM time
// this serverless function has to spend before its time limit hits.
function buildPrompt(snapshot: MarketSnapshot): string {
  const personaList = PERSONAS.map((p) => `${p.name} (${p.category}, Fokus: ${p.focus})`).join("; ");
  return `Marktdaten für ${snapshot.symbol}: Preis ${snapshot.price}, 1h ${snapshot.change1h.toFixed(2)}%, 24h ${snapshot.change24h.toFixed(2)}%, SMA20 ${snapshot.sma20.toFixed(4)}, EMA12 ${snapshot.ema12.toFixed(4)}, EMA26 ${snapshot.ema26.toFixed(4)}, RSI14 ${snapshot.rsi14.toFixed(1)}, ATR14 ${snapshot.atr14.toFixed(4)}, Volumen ${snapshot.volumeVsAvg.toFixed(2)}x Durchschnitt, Trend ${snapshot.trend}, Regime ${snapshot.regime}.

Fünf Analysten bewerten NUR diese Zahlen, je ein Satz Begründung: ${personaList}.

Antworte NUR mit JSON in genau diesem Format, keine Erklärung davor oder danach:
{"direction":"long|short|neutral","confidence":0-100,"summary":"ein Satz","personas":[{"name":"...","category":"...","vote":"long|short|neutral","reasoning":"ein Satz"}]}`;
}

interface ParsedSignal {
  direction: "long" | "short" | "neutral";
  confidence: number;
  summary: string;
  personas: { name: string; category: string; vote: "long" | "short" | "neutral"; reasoning: string }[];
}

const VOTES = new Set(["long", "short", "neutral"]);

/**
 * Unlike a schema-constrained hosted API, this small local model has no
 * grammar-guaranteed JSON output — it has to be found and validated inside
 * whatever text comes back. Falls back to an honest "neutral, unparsed"
 * result (flagged via `parseFailed`) rather than throwing, since a parse
 * failure here isn't a real network/server error — it's a plausible normal
 * outcome for a model this small.
 */
function extractSignal(text: string): ParsedSignal | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Partial<ParsedSignal>;
    if (!raw.direction || !VOTES.has(raw.direction)) return null;
    const personas = Array.isArray(raw.personas)
      ? raw.personas
          .filter((p): p is ParsedSignal["personas"][number] => !!p && typeof p.name === "string" && VOTES.has(p.vote as string))
          .map((p) => ({ name: p.name, category: p.category ?? "", vote: p.vote, reasoning: p.reasoning ?? "" }))
      : [];
    return {
      direction: raw.direction,
      confidence: typeof raw.confidence === "number" ? Math.max(0, Math.min(100, raw.confidence)) : 0,
      summary: typeof raw.summary === "string" ? raw.summary : "",
      personas,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let snapshot: MarketSnapshot;
  try {
    snapshot = (await req.json()) as MarketSnapshot;
  } catch {
    return Response.json({ error: "Ungültiger Request-Body." }, { status: 400 });
  }
  if (typeof snapshot?.price !== "number" || typeof snapshot?.symbol !== "string") {
    return Response.json({ error: "Ungültiger oder fehlender Markt-Snapshot." }, { status: 400 });
  }

  try {
    const generator = await getGenerator();
    const output = await generator([{ role: "user", content: buildPrompt(snapshot) }], {
      max_new_tokens: 400,
      temperature: 0.5,
      do_sample: true,
    });

    const first = Array.isArray(output) ? output[0] : output;
    const generatedText = first?.generated_text;
    const lastContent = Array.isArray(generatedText) ? generatedText.at(-1)?.content : generatedText;
    const text = typeof lastContent === "string" ? lastContent : "";

    const parsed = extractSignal(text);
    if (!parsed) {
      return Response.json({
        direction: "neutral",
        confidence: 0,
        summary: "Die Antwort des lokalen Mini-Modells konnte nicht zuverlässig als JSON gelesen werden — als neutral gewertet.",
        personas: [],
        parseFailed: true,
      });
    }
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Analyse fehlgeschlagen." }, { status: 502 });
  }
}
