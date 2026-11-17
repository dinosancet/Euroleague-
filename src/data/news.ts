/**
 * Placeholder articles until a news source is connected. Headlines are made up;
 * team codes match the live data so the "Für dich" filter already works.
 */
export type NewsKind = "news" | "transfer";

export interface NewsArticle {
  id: string;
  league: string;
  kind: NewsKind;
  /** Shown in the "Top News" filter. */
  top: boolean;
  tag: string;
  title: string;
  source: string;
  /** Minutes since publication, for the "vor 2 Std." label. */
  ageMin: number;
  /** Club codes as used by the data feed. */
  teams: string[];
  body: string;
}

const BODY =
  "Hier steht später der vollständige Artikel aus einer lizenzierten Nachrichtenquelle. " +
  "In der Entwicklungsversion zeigt dieser Bildschirm, wie eine Nachricht aufgebaut ist: Titel, Quelle, Bild und darunter die erwähnten Teams.";

type Draft = Omit<NewsArticle, "body" | "league" | "source"> & {
  source?: string;
};

const drafts: Draft[] = [
  {
    id: "n1",
    kind: "news",
    top: true,
    tag: "Spielbericht",
    teams: ["OLY", "MAD"],
    ageMin: 35,
    title:
      "Piräus bebt: Olympiacos dreht 14-Punkte-Rückstand im Schlussviertel",
  },
  {
    id: "n2",
    kind: "transfer",
    top: true,
    tag: "Transfer",
    teams: ["MUN"],
    ageMin: 80,
    title: "Bayern holt erfahrenen Center für die zweite Saisonhälfte",
  },
  {
    id: "n3",
    kind: "news",
    top: false,
    tag: "Analyse",
    teams: ["PAN", "ULK"],
    ageMin: 150,
    title:
      "Warum die Defensive über den Titel entscheidet: drei Teams im Vergleich",
  },
  {
    id: "n4",
    kind: "news",
    top: true,
    tag: "Verletzung",
    teams: ["BAR"],
    ageMin: 200,
    title: "Barça-Spielmacher fällt zwei Wochen mit Knöchelverletzung aus",
  },
  {
    id: "n5",
    kind: "transfer",
    top: false,
    tag: "Gerücht",
    teams: ["PAN", "IST"],
    ageMin: 260,
    title: "Panathinaikos und Efes buhlen um denselben Flügelspieler",
  },
  {
    id: "n6",
    kind: "news",
    top: false,
    tag: "Spieltag",
    teams: ["ZAL", "PRS", "PAM"],
    ageMin: 400,
    title: "Vorschau auf den Spieltag: Fünf Spiele, auf die du achten solltest",
  },
  {
    id: "n7",
    kind: "transfer",
    top: false,
    tag: "Vertrag",
    teams: ["MUN"],
    ageMin: 600,
    title: "Bayern verlängert mit Kapitän bis 2029",
  },
  {
    id: "n8",
    kind: "news",
    top: false,
    tag: "Interview",
    teams: ["TEL"],
    ageMin: 1300,
    title:
      "„Die Halle ist unser sechster Mann“: Coach über das Heimspiel-Comeback",
  },
  {
    id: "n9",
    kind: "news",
    top: false,
    tag: "Statistik",
    teams: ["IST", "DUB"],
    ageMin: 2900,
    title: "Die effizientesten Werfer der Saison in einer Grafik",
  },
];

export const NEWS: NewsArticle[] = drafts.map((n) => ({
  ...n,
  league: "euroleague",
  source: n.source ?? "Beispielartikel",
  body: BODY,
}));

export const newsById = (id: string) => NEWS.find((n) => n.id === id);

export function ageLabel(min: number) {
  if (min < 60) return `vor ${min} Minuten`;
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? "vor 1 Stunde" : `vor ${h} Stunden`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}
