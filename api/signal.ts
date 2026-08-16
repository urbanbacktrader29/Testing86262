import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { MarketSnapshot } from "../src/types.ts";

// After five separate attempts at a genuinely key-free model (browser WebLLM
// crashed the user's device; @huggingface/transformers' Node build needs a
// >500MB native package; its Edge build gets rejected by Vercel's bundler
// over onnxruntime-common; @wllama/wllama hard-requires a Web Worker, which
// neither Node nor Edge runtimes provide; node-llama-cpp needs native
// compilation Vercel's build step can't reliably do) — this uses a hosted
// open-weight model via Groq instead. Requires a free GROQ_API_KEY
// (console.groq.com, no payment method needed), set as a Vercel environment
// variable — never committed here.
const MODEL = "llama-3.1-8b-instant";

const PERSONAS = [
  { name: "Trend-Analyst", category: "Trend", focus: "Preis relativ zu SMA(20)/EMA(12/26) — folgt der Preis dem Trend oder widerspricht er ihm?" },
  { name: "Momentum-Analyst", category: "Momentum", focus: "RSI(14) und EMA-Crossover — überkauft/überverkauft, Momentum-Wechsel?" },
  { name: "Volatilitäts-Analyst", category: "Volatilität", focus: "ATR(14) relativ zum Preis und das Markt-Regime — genug Bewegung für ein Setup, oder zu ruhig/zu chaotisch?" },
  { name: "Volumen-Analyst", category: "Volumen", focus: "Volumen im Verhältnis zum 20-Kerzen-Durchschnitt — bestätigt das Volumen die Preisbewegung?" },
  { name: "Kontra-Stimme", category: "Risiko", focus: "Sucht aktiv nach Gründen, warum die anderen vier Personas falsch liegen könnten." },
];

function buildPrompt(snapshot: MarketSnapshot): string {
  const personaList = PERSONAS.map((p) => `- "${p.name}" (Kategorie: ${p.category}): ${p.focus}`).join("\n");
  return `Du bist ein Gremium aus fünf unabhängigen Krypto-Trading-Analysten für eine kurzfristige (Intraday/Scalping) technische Einschätzung.

Dir liegen AUSSCHLIESSLICH die folgenden real berechneten Marktdaten vor — keine Nachrichten, keine Spekulation über Ereignisse außerhalb dieser Zahlen:

Symbol: ${snapshot.symbol}
Aktueller Preis: ${snapshot.price}
Änderung letzte Stunde: ${snapshot.change1h.toFixed(2)}%
Änderung 24h: ${snapshot.change24h.toFixed(2)}%
SMA(20): ${snapshot.sma20.toFixed(4)}
EMA(12): ${snapshot.ema12.toFixed(4)}
EMA(26): ${snapshot.ema26.toFixed(4)}
RSI(14): ${snapshot.rsi14.toFixed(1)}
ATR(14): ${snapshot.atr14.toFixed(4)}
Volumen vs. 20-Kerzen-Durchschnitt: ${snapshot.volumeVsAvg.toFixed(2)}x
Kurztrend: ${snapshot.trend}
Markt-Regime: ${snapshot.regime}

Bewerte als fünf unabhängige Personas, jede mit eigenem Fokus:
${personaList}

Jede Persona gibt vote (long/short/neutral) und eine kurze, konkrete Begründung ab, die sich auf die tatsächlichen Zahlen oben bezieht — keine erfundenen Fakten.

Synthetisiere danach eine Gesamt-direction (long/short/neutral) und eine confidence (0-100), die widerspiegelt, wie einig sich die Personas sind UND wie stark die Daten das Signal stützen. Sei konservativ: hohe Konfidenz nur bei klarer Übereinstimmung und stimmigen Daten; bei Uneinigkeit oder schwachen/widersprüchlichen Daten niedrige Konfidenz oder "neutral". Das ist keine Anlageberatung, sondern eine rein technische Einschätzung.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt in genau diesem Format, kein weiterer Text:
{"direction":"long|short|neutral","confidence":0-100,"summary":"1-2 Sätze","personas":[{"name":"...","category":"...","vote":"long|short|neutral","reasoning":"1-2 Sätze"}]}`;
}

interface ParsedSignal {
  direction: "long" | "short" | "neutral";
  confidence: number;
  summary: string;
  personas: { name: string; category: string; vote: "long" | "short" | "neutral"; reasoning: string }[];
}

const VOTES = new Set(["long", "short", "neutral"]);

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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GROQ_API_KEY ist auf dem Server nicht gesetzt." });
    return;
  }

  const snapshot = req.body as MarketSnapshot | undefined;
  if (!snapshot || typeof snapshot.price !== "number" || typeof snapshot.symbol !== "string") {
    res.status(400).json({ error: "Ungültiger oder fehlender Markt-Snapshot im Request-Body." });
    return;
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: buildPrompt(snapshot) }],
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      res.status(502).json({ error: `Groq-API-Fehler (${groqRes.status}): ${errText.slice(0, 300)}` });
      return;
    }

    const data = (await groqRes.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      res.status(502).json({ error: "Leere Antwort von Groq." });
      return;
    }

    const parsed = extractSignal(text);
    if (!parsed) {
      res.status(200).json({
        direction: "neutral",
        confidence: 0,
        summary: "Die KI-Antwort konnte nicht zuverlässig als JSON gelesen werden — als neutral gewertet.",
        personas: [],
        parseFailed: true,
      });
      return;
    }
    res.status(200).json(parsed);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Analyse fehlgeschlagen." });
  }
}
