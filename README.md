# Krypto Analyse Plattform

Live-Marktdaten, Charts und KI-gestützte Signale für Kryptowährungen. Marktdaten kommen von der öffentlichen Binance-API (kein Schlüssel nötig), die Signal-Analyse läuft serverseitig auf einem winzigen, quelloffenen KI-Modell — **kein API-Schlüssel, keine laufenden Kosten**.

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite.
- **Backend**: `api/signal.ts` — eine **Vercel Edge Function** (bewusst nicht die normale Node.js-Serverless-Runtime: `@huggingface/transformers`s Node-Build importiert unconditional `onnxruntime-node`, ein natives >500MB-Paket, das in einer normalen Function-Bundle-Größe nicht unterzubringen wäre; der Edge-Build löst automatisch auf die reine WASM-Variante auf).
- **Modell**: [`onnx-community/SmolLM2-360M-Instruct`](https://huggingface.co/onnx-community/SmolLM2-360M-Instruct) — bewusst winzig gewählt (360M Parameter), damit CPU/WASM-Inferenz in einer Serverless-Function überhaupt praktikabel ist. Deutlich unzuverlässiger als große Sprachmodelle; die Konfidenz-Kalibrierungs-Sperre im Bot fängt systematisch überschätzte Konfidenz ab.
- Ein kompakt berechneter Markt-Snapshot (SMA/EMA/RSI/ATR/Volumen, real aus Binance-Kerzen) wird ans Modell übergeben. Anders als bei größeren gehosteten Modellen gibt es hier **kein garantiertes JSON-Schema** — die Antwort wird best-effort geparst; schlägt das fehl, liefert das Backend ehrlich ein neutrales, als solches markiertes Ergebnis statt zu raten.
- Entry/Stop-Loss/Take-Profit-Preise werden **deterministisch aus echter ATR-Volatilität berechnet** — nie vom Modell geschätzt.

## Bekannte Grenzen (bitte ehrlich einordnen)

- Ein 360M-Parameter-Modell liefert spürbar einfachere, gelegentlich inkohärente Begründungen als große Modelle (Gemini, GPT, Claude etc.).
- Edge-Function-Zeitlimits sind knapper als bei normalen Serverless-Functions — bei stark ausgelasteten Cold-Starts kann eine Analyse fehlschlagen (Frontend zeigt das transparent an, kein stiller Fallback).
- Dieser Ansatz ist experimentell und wurde nicht gegen eine echte Vercel-Deployment-Umgebung getestet — reale Grenzen (Speicher, Zeit, Modell-Download-Zuverlässigkeit) zeigen sich erst im Betrieb.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

`npm run dev` startet nur das Frontend (Vite) — `/api`-Routen laufen dabei nicht mit. Für lokale Backend-Tests: `npx vercel dev`.

## Deployment

Vercel-Projekt importieren, keine Umgebungsvariablen nötig — jeder Push deployt Frontend und Backend automatisch zusammen.
