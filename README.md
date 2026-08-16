# Krypto Analyse Plattform

Live-Marktdaten, Charts und KI-gestützte Signale für Kryptowährungen. Marktdaten kommen von der öffentlichen Binance-API (kein Schlüssel nötig), die Signal-Analyse von Gemini Flash (Google) über ein Vercel-Serverless-Backend.

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite.
- **Backend**: `api/signal.ts` — eine Vercel-Serverless-Function, die einen kompakt berechneten Markt-Snapshot (SMA/EMA/RSI/ATR/Volumen, real aus Binance-Kerzen berechnet) an Gemini Flash schickt und eine strukturierte Einschätzung (Richtung, Konfidenz, mehrere simulierte Analyse-Perspektiven) zurückbekommt.
- Entry/Stop-Loss/Take-Profit-Preise werden **deterministisch aus echter ATR-Volatilität berechnet** — nie vom Modell geschätzt.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

`npm run dev` startet nur das Frontend (Vite) — die `/api`-Routen laufen dabei **nicht** mit, das ist normal für reines `vite dev`. Für lokale Backend-Tests: `npx vercel dev` (benötigt einmalig `vercel login` und ein verknüpftes Projekt).

## Umgebungsvariable

Das Backend braucht `GEMINI_API_KEY` (aus [Google AI Studio](https://aistudio.google.com/apikey)). **Niemals im Code oder in `.env`-Dateien committen** — bei Vercel unter *Project Settings → Environment Variables* eintragen.

## Deployment

Verbindung mit Vercel: Repo importieren, `GEMINI_API_KEY` als Environment Variable setzen, fertig — jeder Push deployt Frontend und Backend automatisch zusammen.
