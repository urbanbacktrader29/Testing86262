# DokuCheck

Schlanke Landingpage: Dokument (PDF oder Text) hochladen → KI liefert sofort 3 kostenlose Schwachstellen → der
vollständige Optimierungs-Report inkl. PDF-Download ist gegen 3,99 € (Stripe Payment Link) freigeschaltet.

## Ablauf

1. **Hochladen** — PDF oder `.txt` per Drag & Drop oder Klick. Der Text wird direkt im Browser extrahiert
   (`pdf.js`), die Originaldatei verlässt das Gerät nie — nur der extrahierte Text geht an die Analyse.
2. **Kostenlose Analyse** — `api/analyze.ts` schickt den Text an OpenAI (`gpt-4o-mini`), das Modell liefert
   3 kurze Schwachstellen **und** einen vollständigen Report. Beides wird in Supabase gespeichert; an den Browser
   gehen aber nur die 3 Schwachstellen — der volle Report bleibt serverseitig gesperrt (`paid = false`).
3. **Zahlung** — Klick auf "Für 3,99 € freischalten" führt zu einem Stripe Payment Link, mit der Analyse-ID als
   `client_reference_id` im Query-String.
4. **Freischaltung** — nach Zahlung leitet Stripe zurück zu `/erfolg?session_id=...`. Die Seite ruft
   `api/verify-payment.ts` auf, das die Session live bei Stripe prüft und `paid = true` setzt (ein Stripe-Webhook
   dient zusätzlich als Backup, falls die Weiterleitung nicht ankommt).
5. **Report** — `api/report.ts` liefert den vollen Report zur Anzeige, `api/download-pdf.ts` generiert daraus
   (mit `pdf-lib`, ohne Chromium/Puppeteer) ein herunterladbares PDF.

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS.
- **Backend**: Vercel-Serverless-Functions unter `api/` (Node-Runtime, kein schwergewichtiges natives Paket).
- **KI**: OpenAI Chat-Completions-API per `fetch` (kein SDK nötig).
- **Datenbank**: Supabase-Postgres-Tabelle `document_analyses` — Row-Level-Security ohne Policies, also nur über
  den Service-Role-Key (serverseitig) erreichbar. Der Browser hat **keinen** direkten DB-Zugriff.
- **PDF-Erzeugung**: `pdf-lib` (reines JS, keine native/Chromium-Abhängigkeit — läuft problemlos in einer
  Serverless-Function).
- **Zahlung**: Stripe Payment Link (kein Checkout-Session-Erstellungscode nötig) + serverseitige Verifizierung.

## Einrichtung (erforderlich, bevor die App live nutzbar ist)

Diese App braucht mehrere Konten/Keys, die nur du anlegen kannst — ich konnte sie nicht selbst erstellen.

### 1. OpenAI

- API-Key auf [platform.openai.com](https://platform.openai.com/api-keys) erstellen (kostenpflichtig nach
  Verbrauch, kein Freikontingent).
- Als Vercel-Umgebungsvariable: `OPENAI_API_KEY`.

### 2. Supabase

Nutzt das bestehende Projekt `dokument-optimierer`-Tabelle im Projekt `blitzer-warner`
([Dashboard](https://supabase.com/dashboard/project/ycedguriwlcardgyagxb)):

- `SUPABASE_URL` = `https://ycedguriwlcardgyagxb.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = unter **Project Settings → API → service_role key** kopieren (**geheim!** nie ins
  Frontend/Repo, nur als Vercel-Umgebungsvariable).

### 3. Stripe

1. Payment Link erstellen: [Stripe Dashboard → Payment Links](https://dashboard.stripe.com/payment-links) →
   Produkt "Optimierungs-Report", Preis **3,99 €**, einmalige Zahlung.
2. Unter **"After payment"** → **"Redirect customers to a website"** eintragen:
   `https://<deine-domain>/erfolg?session_id={CHECKOUT_SESSION_ID}`
   (Stripe ersetzt `{CHECKOUT_SESSION_ID}` automatisch — das ist kein Platzhalter, den du selbst ausfüllst.)
3. Die fertige Payment-Link-URL als **Vercel-Umgebungsvariable** `VITE_STRIPE_PAYMENT_LINK_URL` eintragen
   (öffentlich, landet im Frontend-Bundle — das ist bei Payment Links so vorgesehen).
4. API-Keys: [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys) →
   `STRIPE_SECRET_KEY` als Vercel-Umgebungsvariable.
5. **Webhook** (Backup-Freischaltung, empfohlen): [Developers → Webhooks](https://dashboard.stripe.com/webhooks)
   → Endpoint `https://<deine-domain>/api/stripe-webhook`, Event `checkout.session.completed`. Das dabei
   angezeigte Signing Secret als `STRIPE_WEBHOOK_SECRET` eintragen.

### Vercel-Umgebungsvariablen — Übersicht

| Variable | Geheim? | Zweck |
|---|---|---|
| `OPENAI_API_KEY` | ja | Analyse |
| `SUPABASE_URL` | nein | Datenbank |
| `SUPABASE_SERVICE_ROLE_KEY` | **ja** | Datenbank (voller Zugriff!) |
| `STRIPE_SECRET_KEY` | ja | Zahlungsprüfung |
| `STRIPE_WEBHOOK_SECRET` | ja | Webhook-Signaturprüfung |
| `VITE_STRIPE_PAYMENT_LINK_URL` | nein | Freischalten-Button |

## Bekannte Grenzen

- Es gibt keine Nutzerkonten — eine Analyse ist über ihre (unratbare) UUID erreichbar, sonst keine Zugriffskontrolle.
- Der volle Report wird bei jeder Analyse von der KI mit erzeugt (auch wenn nie bezahlt wird) — das hält den Code
  einfach, kostet aber pro Analyse ein etwas teureres Prompt als nötig.
- Kein Retry/Queue bei OpenAI-Rate-Limits — schlägt eine Analyse fehl, muss neu hochgeladen werden.
- PDF-Layout ist bewusst schlicht (Fließtext + Überschriften), kein Corporate-Design.

## Lokale Entwicklung

```bash
npm install
npx vercel dev
```

`npm run dev` (nur Vite) reicht **nicht** — die `/api`-Routen laufen dann nicht mit und jede Analyse schlägt fehl.
Für `vercel dev` eine lokale `.env` mit allen oben genannten Variablen anlegen (`VITE_`-Variablen zusätzlich in
`.env.local`, wie von Vite vorgesehen).

## Deployment

Vercel-Projekt importieren, alle Umgebungsvariablen aus der Tabelle oben eintragen, deployen. `vercel.json` sorgt
dafür, dass `/api/*` durchgereicht wird und alle anderen Pfade auf die React-App fallen (Client-Routing).
