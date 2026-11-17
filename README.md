# Hoopline

Euroleague-App für iOS und Android (Arbeitstitel „Hoopline“), gebaut mit Expo, React Native und TypeScript. Läuft zum Testen auch im Browser.

> **Beispieldaten:** Alle Ergebnisse, Spieler und News in dieser Version sind erfunden. Teams werden mit Farbkürzeln statt Logos dargestellt, bis Lizenzen geklärt sind.

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

```bash
npm install
npx expo start        # QR-Code mit der Expo-Go-App scannen
npx expo start --web  # im Browser
```

## Prüfen

```bash
npm run typecheck
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
    types.ts      Datenmodell
    mock.ts       Beispieldaten
    store.ts      Zustand, Live-Simulation, Favoriten
  theme.ts        Farben, Schriften, Abstände
```

Die Screens greifen nur über `src/data/store.ts` auf Daten zu. Für echte Daten wird später `mock.ts` durch einen lizenzierten Anbieter ersetzt.

## Nächste Schritte

- Datenanbieter mit Lizenz für App-Store-Veröffentlichung auswählen
- Push-Benachrichtigungen (expo-notifications)
- App-Icon, Splash-Screen und endgültiger Name
- Build und Veröffentlichung über EAS
