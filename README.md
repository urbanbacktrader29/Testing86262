# Doodle Party

Multiplayer-Zeichen-&-Rate-Partyspiel (Skribbl-Klon) als mobil-optimierte Web-App. Ein Spieler zeichnet ein Wort, alle anderen raten per Chat um die Wette — schnelles Raten bringt mehr Punkte.

## Architektur

- **Frontend**: Vite + React + TypeScript + Tailwind CSS, als statische SPA deployt (React Router für `/` und `/r/:code`).
- **Backend**: Kein eigener Server — [Supabase](https://supabase.com) übernimmt Datenhaltung, Echtzeit-Sync und Spiellogik:
  - **Postgres** speichert Räume, Spieler, Chat-Nachrichten.
  - **Realtime (Postgres Changes)** synchronisiert Raum-/Spieler-/Chat-State live zwischen allen Clients.
  - **Realtime Broadcast** überträgt die Zeichen-Striche verlustfrei und ohne DB-Last an alle Mitspieler (Zeichnungen werden nicht dauerhaft gespeichert).
  - **SECURITY DEFINER SQL-Funktionen** (RPC) kapseln jede Spielregel serverseitig: Raum erstellen/beitreten, Spiel starten, Rundenwechsel, Wort-Zuteilung, Rate-Prüfung, Punktevergabe. Das gesuchte Wort liegt in einer Tabelle ohne jegliche Client-Berechtigung (kein `SELECT`-Grant für `anon`/`authenticated`) — nur die Funktion `get_my_word` gibt es gezielt an den aktuellen Zeichner zurück, alle anderen Clients erhalten `null`.
- **Rundenübergänge sind zeitgesteuert statt host-abhängig**: jeder verbundene Client ruft periodisch `advance_turn()` auf; die Funktion ist idempotent (wirkt nur, wenn die Zeit wirklich abgelaufen ist), sodass das Spiel auch weiterläuft, wenn das Host-Tab im Hintergrund gedrosselt wird — ein häufiges Problem bei mobilen Browsern.

## Mobile-Optimierung

- `viewport-fit=cover` + `env(safe-area-inset-*)` für Geräte mit Notch/Home-Indicator.
- Touch-first Zeichen-Canvas (Pointer Events, `touch-action: none`, keine versehentliche Seiten-Scroll/Zoom-Gesten beim Malen).
- `overscroll-behavior: none`, `user-scalable=no` gegen Pull-to-Refresh und Pinch-Zoom während des Spiels.
- 16px-Mindestschriftgröße auf Eingabefeldern (verhindert automatisches Zoomen auf iOS Safari).
- Große Touch-Targets (Farbwahl, Buttons), Ein-Hand-Layout mit fixiertem Rate-Eingabefeld am unteren Rand.
- PWA-Manifest (`public/manifest.webmanifest`) für „Zum Homescreen hinzufügen".

## Spielablauf

1. Host erstellt einen Raum → 5-stelliger Code, den er teilt (Web Share API mit Zwischenablage-Fallback).
2. Mitspieler treten per Code bei (Lobby zeigt Live-Spielerliste).
3. Host startet mit 2–5 Runden. Jede Runde zeichnet reihum jeder Spieler einmal (80 Sekunden).
4. Richtige Rate-Treffer geben Punkte nach verbleibender Zeit (10–100), der Zeichner bekommt pro Treffer +20.
5. Nach der letzten Runde: Endstand mit Podest-Emojis, Host kann eine neue Runde mit denselben Spielern starten.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # enthält bereits die Projekt-URL/den publishable Key
npm run dev
```

## Deployment

1. Vercel-Projekt mit diesem Repo verbinden.
2. Environment Variables `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` aus `.env.example` übernehmen (der `anon`/publishable Key ist bewusst öffentlich — Sicherheit läuft über Row Level Security + die serverseitigen RPC-Funktionen, nicht über Geheimhaltung des Keys).
3. Jeder Push deployt automatisch.

## Bekannte Grenzen

- Kein echtes Nutzerkonto/Auth — die Spieler-Identität ist eine clientseitig generierte ID (persistiert in `localStorage`), ausreichend für ein Party-Spiel unter Freunden, aber nicht manipulationssicher gegenüber technisch versierten Mitspielern (z. B. könnte ein Client mit fremder `player_id` raten).
- Zeichnungen werden nur per Broadcast übertragen, nicht persistiert — späte Beitritte erhalten einen Snapshot vom aktuellen Zeichner, aber nur wenn dessen Tab gerade aktiv verbunden ist.
- App-Icons (`public/icon-*.png`) sind Platzhalter aus einem früheren Projekt und noch nicht an das neue Design angepasst.
