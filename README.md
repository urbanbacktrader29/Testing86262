# NovaRamp — Krypto-On-Ramp-Frontend

Eigenständige Frontend-Webseite für den Fiat-zu-Krypto-Kauf. Nutzer wählen Betrag, Fiat-Währung
und Zielkryptowährung, vergleichen Zahlungsanbieter live und schließen den Kauf über das
eingebettete [Onramper](https://onramper.com)-Widget ab — KYC, Zahlung und Auszahlung übernimmt
vollständig Onramper bzw. die dahinterliegenden lizenzierten Anbieter.

## Wo trage ich meinen Onramper API-Key ein?

Der Key wird **nicht** hart in den Code geschrieben, sondern per Umgebungsvariable
`VITE_ONRAMPER_API_KEY` eingebunden (siehe `src/lib/config.ts`, oben ausführlich kommentiert):

1. **Lokal:** `.env.example` nach `.env.local` kopieren und den Key eintragen:
   ```
   VITE_ONRAMPER_API_KEY=pk_prod_xxxxxxxxxxxxxxxxxxxx
   ```
2. **Auf Vercel:** Project Settings → Environment Variables → `VITE_ONRAMPER_API_KEY` mit dem
   echten Key anlegen (für Production und ggf. Preview).

Den Key findest du in deinem [Onramper Partner-Dashboard](https://dashboard.onramper.com). Die
Partner-Fee ist dort bereits konfiguriert — sobald der korrekte API-Key hier eingetragen ist,
werden alle über das Widget abgeschlossenen Transaktionen automatisch deinem Partner-Account
zugeordnet. Ohne gesetzten Key läuft die Seite im Demo-Modus (Hinweis-Banner im Kauf-Widget, echte
Angebote werden nicht geladen).

**Wichtig:** Onramper ändert gelegentlich unterstützte Query-Parameter bzw. verlangt für den
Produktivbetrieb signierte Widget-URLs (Widget V2). Vor dem Live-Gang unbedingt
[docs.onramper.com](https://docs.onramper.com/docs/supported-widget-parameters) prüfen — die
URL-Erzeugung liegt zentral in `src/lib/onramper.ts`.

## Seitenstruktur

- `/` — Startseite mit Kauf-Widget, "So funktioniert's" (3 Schritte) und FAQ
- `/impressum` — Impressum (Platzhalter, **rechtlich vor Livegang auszufüllen/prüfen**)
- `/datenschutz` — Datenschutzerklärung (Platzhalter, **rechtlich vor Livegang auszufüllen/prüfen**)

## Branding

Platzhalter-Branding (Name "NovaRamp", Logo, Farben, Support-E-Mail) liegt zentral in
`src/lib/config.ts` (`BRAND`-Objekt) sowie im Logo `src/components/Logo.tsx` und `index.html` /
`public/favicon.svg` / `public/manifest.webmanifest` — dort einfach durch eure eigene Marke
ersetzen.

## Architektur

- **Frontend:** Vite + React + TypeScript + Tailwind CSS — reines Client-Side-Rendering, kein
  Backend nötig, da Onramper KYC/Zahlung/Auszahlung komplett im eingebetteten Widget übernimmt.
- **Onramper-Integration:** `src/lib/onramper.ts` baut die Widget-URL aus Nutzereingaben (Fiat,
  Betrag, Zielkrypto, Wallet-Adresse) und bindet sie per `<iframe>` ein
  (`src/components/BuyWidget.tsx`).
- **Routing:** `react-router-dom` für Start-, Impressum- und Datenschutzseite.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Deployment (Vercel)

1. Repository in Vercel importieren (Framework-Preset "Vite" wird automatisch erkannt).
2. Environment Variable `VITE_ONRAMPER_API_KEY` setzen (siehe oben).
3. Deployen — `vercel.json` sorgt für den SPA-Fallback (Client-Routing funktioniert auch bei
   direktem Aufruf von `/impressum` etc.).

## Bekannte Grenzen / offene Punkte

- Impressum und Datenschutzerklärung sind **Platzhalter** und müssen vor dem Livegang durch
  rechtlich geprüfte, vollständige Texte ersetzt werden.
- Die Wallet-Adress-Prüfung im Formular ist eine grobe Plausibilitätsprüfung, keine echte
  Chain-spezifische Validierung — die eigentliche Validierung übernimmt der Zahlungsanbieter im
  Onramper-Checkout.
- Für Produktivbetrieb mit signierten Onramper-URLs (Widget V2) ist ggf. eine kleine
  Server-Funktion zum Signieren der URL nötig — aktuell wird die unsignierte V1-Query-Variante
  verwendet.
