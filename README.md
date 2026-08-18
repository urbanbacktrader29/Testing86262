# Blitzer-Warner

Eine Web-App, die Blitzer auf einer Karte anzeigt, per GPS warnt, sobald einer in Reichweite kommt, und es
erlaubt, mobile Blitzer für andere Nutzer:innen desselben Geräts zu melden — ähnlich im Konzept zu Apps wie
Blitzer.de, aber als eigenständige, quelloffene Umsetzung ohne deren Daten, Marke oder Backend.

## Funktionen

- **Karte** (`/`): OpenStreetMap-Kartenansicht mit eigenem Standort, Warnradius-Kreis und allen bekannten Blitzern.
- **Liste** (`/liste`): Alle Blitzer sortiert nach Entfernung zum aktuellen Standort.
- **Melden** (`/melden`): Einen mobilen Blitzer an der aktuellen Position melden (Typ, optionales Tempolimit, Notiz).
- **Einstellungen** (`/einstellungen`): Warnradius, Warnton an/aus, Live-Ortung an/aus, Gültigkeitsdauer gemeldeter
  Blitzer.
- **Live-Warnung**: Sobald ein Blitzer innerhalb des eingestellten Radius liegt, erscheint ein Banner mit
  Entfernung und Typ, begleitet von einem Warnton (Web Audio API, keine Audiodatei nötig).

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite. Kein Backend/API nötig.
- **Karte**: [Leaflet](https://leafletjs.com) + `react-leaflet`, Kacheln von OpenStreetMap.
- **Standort**: Browser-Geolocation-API (`watchPosition`), lokal per React-Context an alle Seiten verteilt.
- **Datenhaltung**: Alles läuft rein im Browser über `localStorage` — Einstellungen und gemeldete Blitzer bleiben
  auf dem jeweiligen Gerät, es gibt keinen Server, der Daten zwischen Geräten synchronisiert.
- **Blitzerdaten**: Fest installierte Blitzer sind ein kleiner **Demo-Datensatz** (`src/data/cameras.ts`) für ein
  paar deutsche Städte. Es gibt keine offene, lizenzfreie Datenbank aller echten Blitzerstandorte — für einen
  produktiven Einsatz müsste dieser Datensatz durch eine lizenzierte Quelle oder eine selbst gepflegte, geteilte
  Datenbank (z. B. über ein eigenes Backend) ersetzt werden. Mobile Blitzer kommen ausschließlich aus eigenen
  Meldungen über die App und laufen nach der eingestellten Zeit automatisch ab.

## Rechtlicher Hinweis

In Deutschland (§ 23 Abs. 1b StVO) und einigen anderen Ländern ist es Fahrer:innen untersagt, Blitzerwarner
während der aktiven Fahrt zu bedienen oder ein entsprechendes Gerät dafür zu nutzen. Diese App ersetzt keine
rechtliche Beratung — bitte vor Nutzung die jeweils geltenden Vorschriften prüfen und das Gerät nicht während der
Fahrt bedienen.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Für Live-Standort und Kartenkacheln wird eine Internetverbindung sowie (im Browser) die Freigabe des Standorts
benötigt. Ohne Standortfreigabe funktionieren Karte und Liste weiterhin, aber ohne Entfernungsangaben oder
Live-Warnung.

## Deployment

Statische Vite-App, kein Backend/API-Key nötig.

**Vercel**: Projekt importieren, `npm run build` als Build-Command, `dist` als Output.

**GitHub Pages**: `.github/workflows/deploy-pages.yml` baut und deployt automatisch bei jedem Push auf `main`
(oder manuell über den "Run workflow"-Button). Einmalig muss in den Repo-Einstellungen unter
**Settings → Pages → Source** auf **"GitHub Actions"** umgestellt werden. Die App wird dann unter
`https://<user>.github.io/Testing86262/` erreichbar sein. Der Build setzt für diesen Fall `GITHUB_PAGES=true`,
damit Vite den passenden Unterpfad (`base: "/Testing86262/"`) verwendet; ein `404.html` (Kopie von `index.html`)
sorgt dafür, dass client-seitiges Routing (React Router) auch bei direkt aufgerufenen Unterseiten funktioniert.
