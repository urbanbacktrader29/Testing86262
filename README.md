# Krypto Analyse Plattform

Live-Marktdaten, Charts und KI-gestützte Signale für Kryptowährungen. Marktdaten kommen von der öffentlichen Binance-API (kein Schlüssel nötig), die Signal-Analyse läuft komplett **lokal im Browser** — kein API-Schlüssel, kein Server, keine Kosten pro Anfrage.

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite.
- **KI**: [`@mlc-ai/web-llm`](https://github.com/mlc-ai/web-llm) lädt Llama 3.2 (3B, quantisiert, ~2,3 GB) direkt in den Browser des Nutzers und führt Inferenz über WebGPU aus (`src/services/localAi.ts`, läuft in einem Web Worker). Der Download passiert einmalig beim ersten Signal und wird danach vom Browser zwischengespeichert.
- Ein kompakt berechneter Markt-Snapshot (SMA/EMA/RSI/ATR/Volumen, real aus Binance-Kerzen) wird ans Modell übergeben; die Antwort ist JSON-Schema-constrained (garantiert valides JSON).
- Entry/Stop-Loss/Take-Profit-Preise werden **deterministisch aus echter ATR-Volatilität berechnet** — nie vom Modell geschätzt.

## Voraussetzungen für die KI-Funktionen

- Ein **WebGPU-fähiger Browser** (aktuelles Chrome oder Edge; Desktop/Laptop empfohlen — Mobilgeräte haben oft nicht genug Grafikspeicher).
- Beim ersten Signal wird das Modell heruntergeladen (~2,3 GB, einmalig, dann gecacht).
- Die Analyse läuft nur, solange der Tab in diesem Browser geöffnet ist.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Deployment

Reines statisches Deployment (z. B. Vercel) — keine Umgebungsvariablen, kein Backend nötig.
