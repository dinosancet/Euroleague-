import { ComingSoon } from "@/components/coming-soon";

export default function TipsScreen() {
  return (
    <ComingSoon
      icon="trophy-outline"
      title="Tippspiel"
      text="Tippe auf Spiele und Spielerleistungen, sammle Punkte und miss dich mit deinen Freunden. Ohne Geldeinsatz."
      points={[
        "Ergebnisse und Sieger tippen",
        "Spieler-Tipps, z. B. wer die meisten Punkte macht",
        "Rangliste für alle und private Ligen mit Freunden",
      ]}
    />
  );
}
