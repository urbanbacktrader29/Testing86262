import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";
import type { MarketSnapshot } from "../src/types.ts";

// Kept as a single named constant so swapping model versions is a one-line
// change. "latest" aliases track Google's current recommended Flash model
// instead of pinning a version that eventually gets deprecated.
const MODEL = "gemini-flash-latest";

const PERSONAS = [
  { name: "Trend-Analyst", category: "Trend", focus: "Preis relativ zu SMA(20)/EMA(12/26) — folgt der Preis dem Trend oder widerspricht er ihm?" },
  { name: "Momentum-Analyst", category: "Momentum", focus: "RSI(14) und EMA-Crossover — überkauft/überverkauft, Momentum-Wechsel?" },
  { name: "Volatilitäts-Analyst", category: "Volatilität", focus: "ATR(14) relativ zum Preis und das Markt-Regime — genug Bewegung für ein Setup, oder zu ruhig/zu chaotisch?" },
  { name: "Volumen-Analyst", category: "Volumen", focus: "Volumen im Verhältnis zum 20-Kerzen-Durchschnitt — bestätigt das Volumen die Preisbewegung?" },
  { name: "Kontra-Stimme", category: "Risiko", focus: "Sucht aktiv nach Gründen, warum die anderen vier Personas falsch liegen könnten — Gegenposition, keine automatische Zustimmung." },
];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    direction: { type: Type.STRING, enum: ["long", "short", "neutral"] },
    confidence: { type: Type.NUMBER, description: "0-100, wie stark Daten und Personas übereinstimmend für 'direction' sprechen" },
    summary: { type: Type.STRING, description: "1-2 Sätze auf Deutsch, fasst die Gesamteinschätzung zusammen" },
    personas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          vote: { type: Type.STRING, enum: ["long", "short", "neutral"] },
          reasoning: { type: Type.STRING, description: "1-2 Sätze auf Deutsch, konkret auf die Zahlen bezogen" },
        },
        required: ["name", "category", "vote", "reasoning"],
      },
    },
  },
  required: ["direction", "confidence", "summary", "personas"],
};

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

Synthetisiere danach eine Gesamt-direction (long/short/neutral) und eine confidence (0-100), die widerspiegelt, wie einig sich die Personas sind UND wie stark die Daten das Signal stützen. Sei konservativ: hohe Konfidenz nur bei klarer Übereinstimmung und stimmigen Daten; bei Uneinigkeit oder schwachen/widersprüchlichen Daten niedrige Konfidenz oder "neutral". Das ist keine Anlageberatung, sondern eine rein technische Einschätzung.`;
}

interface GeminiSignalPayload {
  direction: "long" | "short" | "neutral";
  confidence: number;
  summary: string;
  personas: { name: string; category: string; vote: "long" | "short" | "neutral"; reasoning: string }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY ist auf dem Server nicht gesetzt." });
    return;
  }

  const snapshot = req.body as MarketSnapshot | undefined;
  if (!snapshot || typeof snapshot.price !== "number" || typeof snapshot.symbol !== "string") {
    res.status(400).json({ error: "Ungültiger oder fehlender Markt-Snapshot im Request-Body." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: buildPrompt(snapshot),
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      res.status(502).json({ error: "Leere Antwort von Gemini." });
      return;
    }

    const payload = JSON.parse(text) as GeminiSignalPayload;
    res.status(200).json(payload);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Gemini-Anfrage fehlgeschlagen." });
  }
}
