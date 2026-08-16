import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
import type { Direction, MarketSnapshot, PersonaOpinion } from "../types";

// Chosen deliberately over the (larger, higher-quality) alternatives WebLLM
// ships: Llama 3.2 officially lists German among its supported languages
// (unlike many small open models, which are English-only or English-first),
// its instruct-tuning follows structured-output instructions reliably
// without a "thinking trace" complicating JSON parsing (unlike Qwen3), and
// at ~2.3GB it's the smallest variant with all of that — the best fit for a
// one-time in-browser download that still needs to reason in German.
export const MODEL_ID = "Llama-3.2-3B-Instruct-q4f16_1-MLC";

export function isWebGpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export interface LocalAiStatus {
  state: "idle" | "loading" | "ready" | "error" | "unsupported";
  progress: number;
  text: string;
  error?: string;
}

let status: LocalAiStatus = { state: "idle", progress: 0, text: "" };
const listeners = new Set<(s: LocalAiStatus) => void>();

function setStatus(next: LocalAiStatus): void {
  status = next;
  listeners.forEach((l) => l(status));
}

export function subscribeLocalAiStatus(fn: (s: LocalAiStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => listeners.delete(fn);
}

export function getLocalAiStatus(): LocalAiStatus {
  return status;
}

let enginePromise: Promise<WebWorkerMLCEngine> | null = null;

/**
 * Lazily creates (once) and returns the shared in-browser model engine,
 * running in a Web Worker. `@mlc-ai/web-llm` itself is dynamically imported
 * here rather than at module top-level — it's a multi-MB library, and
 * without this every page load (even ones that never touch AI features,
 * like the plain Dashboard) would have to download it upfront.
 */
async function getEngine(): Promise<WebWorkerMLCEngine> {
  if (!isWebGpuSupported()) {
    setStatus({ state: "unsupported", progress: 0, text: "" });
    throw new Error("Dieser Browser unterstützt WebGPU nicht. Bitte ein aktuelles Chrome oder Edge verwenden (Desktop/Laptop empfohlen).");
  }
  if (enginePromise) return enginePromise;

  setStatus({ state: "loading", progress: 0, text: "Lokales KI-Modell wird geladen…" });
  enginePromise = import("@mlc-ai/web-llm")
    .then(({ CreateWebWorkerMLCEngine }) => {
      const worker = new Worker(new URL("../workers/llmWorker.ts", import.meta.url), { type: "module" });
      return CreateWebWorkerMLCEngine(worker, MODEL_ID, {
        initProgressCallback: (report) => {
          setStatus({ state: "loading", progress: report.progress, text: report.text });
        },
      });
    })
    .then((engine) => {
      setStatus({ state: "ready", progress: 1, text: "Bereit" });
      return engine;
    })
    .catch((err) => {
      enginePromise = null;
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "Unbekannter Fehler (evtl. kein funktionierender GPU-Zugriff im Browser).";
      setStatus({ state: "error", progress: 0, text: "", error: message });
      throw err;
    });
  return enginePromise;
}

/** Pre-warms the model — call from a user gesture (e.g. a "KI aktivieren" button) so the download starts predictably rather than surprising the user mid-scroll. */
export function preloadLocalAi(): Promise<void> {
  return getEngine().then(() => undefined);
}

const PERSONAS = [
  { name: "Trend-Analyst", category: "Trend", focus: "Preis relativ zu SMA(20)/EMA(12/26) — folgt der Preis dem Trend oder widerspricht er ihm?" },
  { name: "Momentum-Analyst", category: "Momentum", focus: "RSI(14) und EMA-Crossover — überkauft/überverkauft, Momentum-Wechsel?" },
  { name: "Volatilitäts-Analyst", category: "Volatilität", focus: "ATR(14) relativ zum Preis und das Markt-Regime — genug Bewegung für ein Setup, oder zu ruhig/zu chaotisch?" },
  { name: "Volumen-Analyst", category: "Volumen", focus: "Volumen im Verhältnis zum 20-Kerzen-Durchschnitt — bestätigt das Volumen die Preisbewegung?" },
  { name: "Kontra-Stimme", category: "Risiko", focus: "Sucht aktiv nach Gründen, warum die anderen vier Personas falsch liegen könnten." },
];

const JSON_SCHEMA = {
  type: "object",
  properties: {
    direction: { type: "string", enum: ["long", "short", "neutral"] },
    confidence: { type: "number" },
    summary: { type: "string" },
    personas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          vote: { type: "string", enum: ["long", "short", "neutral"] },
          reasoning: { type: "string" },
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

Synthetisiere danach eine Gesamt-direction (long/short/neutral) und eine confidence (0-100), die widerspiegelt, wie einig sich die Personas sind UND wie stark die Daten das Signal stützen. Sei konservativ: hohe Konfidenz nur bei klarer Übereinstimmung und stimmigen Daten; bei Uneinigkeit oder schwachen/widersprüchlichen Daten niedrige Konfidenz oder "neutral". Das ist keine Anlageberatung, sondern eine rein technische Einschätzung.

Antworte AUSSCHLIESSLICH mit einem JSON-Objekt gemäß Schema, kein weiterer Text.`;
}

export interface LocalAiSignalResult {
  direction: Direction;
  confidence: number;
  summary: string;
  personas: PersonaOpinion[];
}

/** Runs the persona-panel analysis entirely in-browser and returns the parsed, schema-shaped result. */
export async function runPersonaAnalysis(snapshot: MarketSnapshot): Promise<LocalAiSignalResult> {
  const engine = await getEngine();
  const response = await engine.chat.completions.create({
    messages: [{ role: "user", content: buildPrompt(snapshot) }],
    temperature: 0.4,
    max_tokens: 900,
    response_format: { type: "json_object", schema: JSON.stringify(JSON_SCHEMA) },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Leere Antwort vom lokalen KI-Modell.");

  const parsed = JSON.parse(text) as LocalAiSignalResult;
  return parsed;
}
