# Hoopline API (Cloudflare Worker)

Kleiner Server zwischen App und Euroleague-Daten. Er holt Spielplan, Live-Spielstände, Boxscores, Play-by-Play, Tabelle und Kader, bringt sie in ein einheitliches Format (`../shared/api.ts`) und speichert sie zwischen. So fragt nur der Server bei der Datenquelle an, egal wie viele Handys die App offen haben.

> **Datenquelle:** Zurzeit die öffentliche Euroleague-API (`api-live.euroleague.net` und `live.euroleague.net`). Sie ist kostenlos, aber nicht für kommerzielle Apps lizenziert. Vor einer Veröffentlichung im App Store wird sie durch einen lizenzierten Anbieter ersetzt. Dafür muss nur `src/normalize.ts` und `src/index.ts` angepasst werden.

## Endpunkte

| Pfad                  | Inhalt                                                 | Zwischenspeicher              |
| --------------------- | ------------------------------------------------------ | ----------------------------- |
| `GET /v1/games`       | Alle Spiele der Saison, laufende Spiele mit Live-Stand | 60 s, Live-Stand 15 s         |
| `GET /v1/games/:code` | Ein Spiel mit Boxscore und Play-by-Play                | 15 s live, 6 h nach Spielende |
| `GET /v1/standings`   | Tabelle nach dem letzten gespielten Spieltag           | 5 min                         |
| `GET /v1/teams/:code` | Kader eines Clubs, z. B. `MUN`                         | 12 h                          |

## Lokal starten

```bash
cd server
npm install
npm run dev          # http://localhost:8787
```

Die App nutzt standardmäßig den veröffentlichten Server. Für den lokalen Server `EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo start` (auf einem echten Handy im selben WLAN die IP des Computers statt `localhost`).

## Tests

```bash
npm test             # prüft die Umwandlung mit gespeicherten echten Antworten (test/fixtures)
npm run typecheck
```

## Veröffentlichen (kostenlos)

Automatisch über GitHub Actions (`.github/workflows/deploy-server.yml`): Jede Änderung an `server/` auf `main` wird getestet und veröffentlicht. Einmalig einrichten:

1. Kostenloses Konto bei [Cloudflare](https://dash.cloudflare.com/sign-up) anlegen.
2. Unter _Workers & Pages_ einmal eine `workers.dev`-Subdomain wählen.
3. Unter _My Profile → API Tokens → Create Token_ die Vorlage **Edit Cloudflare Workers** nehmen und den Token erstellen.
4. Im GitHub-Repo unter _Settings → Secrets and variables → Actions_ zwei Secrets anlegen: `CLOUDFLARE_API_TOKEN` (der Token) und `CLOUDFLARE_ACCOUNT_ID` (steht rechts auf der Workers-Übersicht).
5. Unter _Actions → Server veröffentlichen → Run workflow_ starten. Die Adresse steht am Ende des Logs, z. B. `https://hoopline-api.<name>.workers.dev`.
6. Diese Adresse steht in `src/data/api.ts` als `DEFAULT_API_URL` (aktuell `https://hoopline-api.94-dino.workers.dev`).

Von Hand geht es auch: `npx wrangler login`, dann `npm run deploy`.

Der Gratisplan von Cloudflare erlaubt 100.000 Anfragen am Tag.

Die Saison steht in `wrangler.toml` (`SEASON = "E2026"`) und wird zur neuen Saison angepasst.
