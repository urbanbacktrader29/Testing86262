# Blitzer-Warner

Eine Web-App, die echte Blitzerstandorte auf einer Karte anzeigt, per GPS warnt, sobald einer in Reichweite kommt,
und es erlaubt, mobile Blitzer live für alle anderen Nutzer:innen zu melden — ähnlich im Konzept zu Apps wie
Blitzer.de, aber als eigenständige, quelloffene Umsetzung mit legal nutzbaren Daten statt deren proprietärer
Datenbank.

## Funktionen

- **Karte** (`/`): OpenStreetMap-Kartenansicht mit eigenem Standort, Warnradius-Kreis und allen bekannten Blitzern;
  Button, um Blitzerdaten für den gerade sichtbaren Kartenausschnitt nachzuladen.
- **Liste** (`/liste`): Alle Blitzer sortiert nach Entfernung zum aktuellen Standort.
- **Melden** (`/melden`): Einen mobilen Blitzer an der aktuellen Position melden (Typ, optionales Tempolimit,
  Notiz) — erscheint in Echtzeit bei allen anderen Nutzer:innen.
- **Einstellungen** (`/einstellungen`): Warnradius, Warnton an/aus, Live-Ortung an/aus, Gültigkeitsdauer gemeldeter
  Blitzer.
- **Live-Warnung**: Sobald ein Blitzer innerhalb des eingestellten Radius liegt, erscheint ein Banner mit
  Entfernung und Typ, begleitet von einem Warnton (Web Audio API, keine Audiodatei nötig).

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, deployt als statische Seite.
- **Karte**: [Leaflet](https://leafletjs.com) + `react-leaflet`, Kacheln von OpenStreetMap.
- **Standort**: Browser-Geolocation-API (`watchPosition`), per React-Context an alle Seiten verteilt.
- **Feste Blitzer & Abschnittskontrollen — echte, weltweite Daten**: live von
  [OpenStreetMap](https://www.openstreetmap.org) über die [Overpass API](https://overpass-api.de) geladen
  (`highway=speed_camera`, `enforcement=maxspeed`), rund um den eigenen Standort bzw. den sichtbaren
  Kartenausschnitt. OSM ist eine offene, community-gepflegte Datenbank (ODbL-Lizenz) — die Abdeckung ist je nach
  Region unterschiedlich vollständig (in Mitteleuropa i. d. R. sehr gut), aber es handelt sich um reale, keine
  erfundenen Standorte. **Bewusst nicht verwendet: Daten von Blitzer.de oder vergleichbaren kommerziellen
  Anbietern** — deren Datenbanken sind proprietär/lizenziert, es gibt keine öffentliche API, und automatisiertes
  Abgreifen würde deren Nutzungsbedingungen verletzen.
- **Mobile Blitzer — echte Synchronisierung**: Meldungen landen in einer [Supabase](https://supabase.com)-Postgres-
  Datenbank und werden per Supabase Realtime (WebSocket) live an alle verbundenen Geräte verteilt — meldet
  jemand einen Blitzer, taucht er sofort bei allen anderen auf, nicht nur lokal im eigenen Browser.
  ⚠️ Es gibt (noch) kein Login-System: Meldungen sind anonym, und da die Datenbank-Policies entsprechend offen
  sind, kann aktuell jede Person jede Meldung bestätigen oder löschen. Für einen Einsatz mit höherem
  Missbrauchsrisiko sollte das durch Auth + engere Row-Level-Security-Policies ersetzt werden.

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

Für Live-Standort, Kartenkacheln, OpenStreetMap-Blitzerdaten und die Supabase-Synchronisierung wird eine
Internetverbindung sowie (im Browser) die Freigabe des Standorts benötigt. Ohne Standortfreigabe funktionieren
Karte und Liste weiterhin, aber ohne Entfernungsangaben, automatisches Nachladen oder Live-Warnung.

## Deployment

Statische Vite-App, kein eigener Server nötig — Supabase-URL und -Publishable-Key sind bewusst im Client-Bundle
(siehe `src/services/supabase.ts`; geschützt über Row-Level-Security, nicht über Geheimhaltung des Keys).

**Vercel**: Projekt importieren, `npm run build` als Build-Command, `dist` als Output.

**GitHub Pages**: `.github/workflows/deploy-pages.yml` baut und deployt automatisch bei jedem Push auf `main`
(oder manuell über den "Run workflow"-Button). Einmalig muss in den Repo-Einstellungen unter
**Settings → Pages → Source** auf **"GitHub Actions"** umgestellt werden. Die App wird dann unter
`https://<user>.github.io/Testing86262/` erreichbar sein. Der Build setzt für diesen Fall `GITHUB_PAGES=true`,
damit Vite den passenden Unterpfad (`base: "/Testing86262/"`) verwendet; ein `404.html` (Kopie von `index.html`)
sorgt dafür, dass client-seitiges Routing (React Router) auch bei direkt aufgerufenen Unterseiten funktioniert.
