# Hoopline

Euroleague-App für iOS und Android (Arbeitstitel „Hoopline“), gebaut mit Expo, React Native und TypeScript. Läuft zum Testen auch im Browser.

> **Daten:** Spielplan, Live-Spielstände, Boxscores, Play-by-Play, Tabelle und Kader kommen echt und live von der Euroleague, über unseren eigenen Server in [`server/`](server/README.md). Diese Quelle ist nur für die Entwicklung gedacht und wird vor dem App-Store-Start durch einen lizenzierten Anbieter ersetzt. Die News sind noch Beispielartikel. Teams werden mit Farbkürzeln statt Logos dargestellt, bis Lizenzen geklärt sind.

## Screens

| Bereich | Inhalt |
| --- | --- |
| Scores | Spieltag-Leiste, Live-Spiele, eigene Teams zuerst |
| Game Center | Ergebnis nach Vierteln, Teamvergleich, Boxscore, Play-by-Play |
| News | Feed mit Filter „Meine Teams“, Artikelansicht |
| Tabelle | Hauptrunde mit Playoff- und Play-In-Zonen, Form der letzten 5 Spiele |
| Team | Bilanz, Spiele, Kader, Folgen-Button |
| Meine Teams | Favoriten und Push-Einstellungen (gespeichert auf dem Gerät) |

## Starten

Zuerst den Datenserver starten (siehe [`server/README.md`](server/README.md)):

```bash
cd server && npm install && npm run dev
```

Dann in einem zweiten Terminal die App:

```bash
npm install
npx expo start        # QR-Code mit der Expo-Go-App scannen
npx expo start --web  # im Browser
```

Die App nutzt den veröffentlichten Server `https://hoopline-api.94-dino.workers.dev`. Für einen lokalen Server setzt man `EXPO_PUBLIC_API_URL`, z. B. `EXPO_PUBLIC_API_URL=http://localhost:8787`.

## Prüfen

```bash
npm run typecheck
cd server && npm test && npm run typecheck
```

## Aufbau

```
src/
  app/            Screens (Expo Router, jede Datei ist eine Route)
    (tabs)/       Scores, News, Tabelle, Meine Teams
    game/[id]     Game Center
    team/[id]     Teamseite
    article/[id]  Artikel
  components/     Wiederverwendbare Bausteine (Spielkarte, Team-Badge, ...)
  data/
    api.ts        Laden vom Server, automatische Aktualisierung bei Live-Spielen
    prefs.ts      Favoriten und Push-Einstellungen (auf dem Gerät gespeichert)
    clubs.ts      Badge-Farben pro Club
    news.ts       Beispielartikel
  lib/format.ts   Datum und Uhrzeit
  theme.ts        Farben, Schriften, Abstände
shared/api.ts     Datenformat zwischen Server und App
server/           Cloudflare Worker mit Zwischenspeicher
```

Die App spricht nur mit unserem eigenen Server. Ein Wechsel des Datenanbieters betrifft daher nur `server/`.

## Nächste Schritte

- Server bei Cloudflare veröffentlichen (kostenlos)
- Vor dem App-Store-Start: lizenzierten Datenanbieter anbinden oder Erlaubnis der Euroleague einholen
- Echte News-Quelle
- Push-Benachrichtigungen (expo-notifications)
- App-Icon, Splash-Screen und endgültiger Name
- Build und Veröffentlichung über EAS
