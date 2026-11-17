/**
 * Placeholder articles until a news source is connected. Headlines are made up;
 * team codes match the live data so the "Meine Teams" filter already works.
 */
export interface NewsArticle {
  id: string;
  tag: string;
  title: string;
  source: string;
  /** Club codes as used by the data feed. */
  teams: string[];
  body: string;
}

const BODY =
  "Hier steht später der vollständige Artikel aus einer lizenzierten Nachrichtenquelle. " +
  "In der Entwicklungsversion zeigt dieser Bildschirm, wie eine Nachricht aufgebaut ist: Titel, Quelle, Bild und darunter die erwähnten Teams.";

export const NEWS: NewsArticle[] = [
  {
    id: "n1",
    tag: "Spielbericht",
    teams: ["OLY", "MAD"],
    title:
      "Piräus bebt: Olympiacos dreht 14-Punkte-Rückstand im Schlussviertel",
    source: "Beispielartikel",
  },
  {
    id: "n2",
    tag: "Transfer",
    teams: ["MUN"],
    title: "Bayern holt erfahrenen Center für die zweite Saisonhälfte",
    source: "Beispielartikel",
  },
  {
    id: "n3",
    tag: "Analyse",
    teams: ["PAN", "ULK"],
    title:
      "Warum die Defensive über den Titel entscheidet: drei Teams im Vergleich",
    source: "Beispielartikel",
  },
  {
    id: "n4",
    tag: "Verletzung",
    teams: ["BAR"],
    title: "Barça-Spielmacher fällt zwei Wochen mit Knöchelverletzung aus",
    source: "Beispielartikel",
  },
  {
    id: "n5",
    tag: "Spieltag",
    teams: ["ZAL", "PRS", "PAM"],
    title: "Vorschau auf den Spieltag: Fünf Spiele, auf die du achten solltest",
    source: "Beispielartikel",
  },
  {
    id: "n6",
    tag: "Interview",
    teams: ["TEL"],
    title:
      "„Die Halle ist unser sechster Mann“: Coach über das Heimspiel-Comeback",
    source: "Beispielartikel",
  },
  {
    id: "n7",
    tag: "Statistik",
    teams: ["IST", "DUB"],
    title: "Die effizientesten Werfer der Saison in einer Grafik",
    source: "Beispielartikel",
  },
].map((n) => ({ ...n, body: BODY }));

export const newsById = (id: string) => NEWS.find((n) => n.id === id);
