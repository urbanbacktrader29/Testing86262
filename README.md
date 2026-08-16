# Krypto Analyse Plattform

Live-Marktdaten, Charts und KI-gestützte Signale für Kryptowährungen. Marktdaten kommen von der öffentlichen Binance-API (kein Schlüssel nötig), die Signal-Analyse läuft serverseitig über [Groq](https://console.groq.com) auf einem offenen KI-Modell (Llama 3.1 8B) — Groq bietet dafür eine **kostenlose** API-Stufe an, es fällt aber ein API-Schlüssel an (siehe Deployment unten).

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite.
- **Backend**: `api/signal.ts` — eine normale Vercel Node.js-Serverless-Function, die per `fetch()` Groqs OpenAI-kompatible Chat-Completions-API aufruft (`llama-3.1-8b-instant`, `response_format: json_object`). Kein ONNX/WASM-Runtime, keine native Abhängigkeit im Bundle.
- Ein kompakt berechneter Markt-Snapshot (SMA/EMA/RSI/ATR/Volumen, real aus Binance-Kerzen) wird als Prompt-Kontext an das Modell übergeben, das fünf unabhängige Analysten-Perspektiven simuliert. Die Antwort wird zusätzlich best-effort geparst; schlägt das JSON-Parsing dennoch fehl, liefert das Backend ehrlich ein neutrales, als solches markiertes Ergebnis (`parseFailed: true`) statt zu raten.
- Entry/Stop-Loss/Take-Profit-Preise werden **deterministisch aus echter ATR-Volatilität berechnet** — nie vom Modell geschätzt.

### Vorherige Ansätze (verworfen)

Vor Groq wurden fünf Ansätze für ein wirklich API-Schlüssel-loses Modell geprüft und verworfen:

1. **Browser-WebLLM** (`@mlc-ai/web-llm`, Llama-3.2-3B via WebGPU) — der ~2.3GB-Modell-Download hat auf Safari iOS den Browser zum Absturz gebracht.
2. **`@huggingface/transformers` auf einer normalen Node-Function** — der Node-Build importiert unconditional `onnxruntime-node`, ein natives >500MB-Paket, das in einer normalen Function-Bundle-Größe nicht unterzubringen ist.
3. **`@huggingface/transformers` auf einer Vercel Edge Function** (Theorie: löst auf die reine WASM-Variante auf) — der Vercel-Build schlug tatsächlich fehl, weil selbst der Web-Build transitiv `onnxruntime-common` referenziert, was Vercels Edge-Bundler-Analyse als nicht unterstütztes Modul ablehnt.
4. **`@wllama/wllama`** — verlangt laut Quellcode zwingend eine `Worker`-Instanz (`new Worker(...)`), die weder in der Node- noch in der Edge-Runtime von Vercel verfügbar ist. Nie deployt, da dies vorab durch Quellcode-Prüfung erkannt wurde.
5. **`node-llama-cpp`** — hängt von `cmake-js` ab, was native Kompilierung beim Build nahelegt; als Risiko eingestuft und nicht implementiert.

## Bekannte Grenzen (bitte ehrlich einordnen)

- Groqs kostenlose Stufe hat Rate-Limits; bei sehr häufigen Anfragen kann eine Analyse fehlschlagen (Frontend zeigt das transparent an, kein stiller Fallback).
- Ein 8B-Parameter-Modell liefert einfachere Begründungen als die größten Modelle (GPT-4-Klasse, Claude etc.), auch wenn es deutlich stärker ist als die zuvor getesteten winzigen On-Device-Modelle.
- Dieser Ansatz wurde nicht gegen eine echte Vercel-Deployment-Umgebung getestet — reale Grenzen (Rate-Limits, Latenz) zeigen sich erst im Betrieb.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

`npm run dev` startet nur das Frontend (Vite) — `/api`-Routen laufen dabei nicht mit. Für lokale Backend-Tests: `npx vercel dev` (benötigt `GROQ_API_KEY` in einer lokalen `.env`-Datei bzw. den Vercel-Umgebungsvariablen).

## Deployment

1. Kostenlosen API-Key auf [console.groq.com](https://console.groq.com) erstellen (kein Zahlungsmittel nötig).
2. Im Vercel-Projekt unter **Settings → Environment Variables** eine Variable `GROQ_API_KEY` mit diesem Key anlegen.
3. Vercel-Projekt importieren/verbinden — jeder Push deployt Frontend und Backend automatisch zusammen.
