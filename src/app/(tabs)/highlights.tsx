import { ComingSoon } from "@/components/coming-soon";

export default function HighlightsScreen() {
  return (
    <ComingSoon
      icon="play-circle-outline"
      title="Highlights"
      text="Hier landen bald die besten Szenen jedes Spieltags als kurze Clips."
      points={[
        "Clips hochladen und ansehen",
        "Highlights nach Team und Spiel filtern",
        "Die Top-Plays der Woche",
      ]}
    />
  );
}
