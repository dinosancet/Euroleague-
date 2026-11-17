# Hoopline API (Cloudflare Worker)

Kleiner Server zwischen App und Euroleague-Daten. Er holt Spielplan, Live-Spielstände, Boxscores, Play-by-Play, Tabelle und Kader, bringt sie in ein einheitliches Format (`../shared/api.ts`) und speichert sie zwischen. So fragt nur der Server bei der Datenquelle an, egal wie viele Handys die App offen haben.

> **Datenquelle:** Zurzeit die öffentliche Euroleague-API (`api-live.euroleague.net` und `live.euroleague.net`). Sie ist kostenlos, aber nicht für kommerzielle Apps lizenziert. Vor einer Veröffentlichung im App Store wird sie durch einen lizenzierten Anbieter ersetzt. Dafür muss nur `src/normalize.ts` und `src/index.ts` angepasst werden.

## Endpunkte

| Pfad | Inhalt | Zwischenspeicher |
| --- | --- | --- |
| `GET /v1/games` | Alle Spiele der Saison, laufende Spiele mit Live-Stand | 60 s, Live-Stand 15 s |
| `GET /v1/games/:code` | Ein Spiel mit Boxscore und Play-by-Play | 15 s live, 6 h nach Spielende |
| `GET /v1/standings` | Tabelle nach dem letzten gespielten Spieltag | 5 min |
| `GET /v1/teams/:code` | Kader eines Clubs, z. B. `MUN` | 12 h |

## Lokal starten

```bash
cd server
npm install
npm run dev          # http://localhost:8787
```

Die App nutzt standardmäßig `http://localhost:8787`. Auf einem echten Handy im selben WLAN stattdessen die IP des Computers eintragen, z. B. `EXPO_PUBLIC_API_URL=http://192.168.0.10:8787 npx expo start`.

## Tests

```bash
npm test             # prüft die Umwandlung mit gespeicherten echten Antworten (test/fixtures)
npm run typecheck
```

## Veröffentlichen (kostenlos)

1. Kostenloses Konto bei [Cloudflare](https://dash.cloudflare.com/sign-up) anlegen.
2. `npx wrangler login`, dann `npm run deploy`.
3. Die angezeigte Adresse (z. B. `https://hoopline-api.<name>.workers.dev`) in der App als `EXPO_PUBLIC_API_URL` setzen.

Der Gratisplan von Cloudflare erlaubt 100.000 Anfragen am Tag.

Die Saison steht in `wrangler.toml` (`SEASON = "E2026"`) und wird zur neuen Saison angepasst.
