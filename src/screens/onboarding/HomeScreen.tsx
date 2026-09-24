import { GameShell } from "../../components/game/GameShell";
import { WelcomeHero } from "../../components/onboarding/WelcomeHero";

export function HomeScreen() {
  return (
    <GameShell variant="onboarding">
      <WelcomeHero />
    </GameShell>
  );
}
