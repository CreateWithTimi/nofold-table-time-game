import { GameShell } from "../../components/game/GameShell";
import { PrimaryButton, SecondaryButton } from "../../components/game/Buttons";
import { WelcomeHero } from "../../components/onboarding/WelcomeHero";
import { useNavigate } from "react-router";
import { addMockPlayer, createLocalRoom, resetRoom } from "../../room/localRoom";

export function HomeScreen() {
  const navigate = useNavigate();

  function createMockRoom() {
    const room = addMockPlayer(addMockPlayer(createLocalRoom("Timi"), "Ada"), "Kelechi");
    navigate(`/room/${room.code}`);
  }

  function resetOnboarding() {
    resetRoom();
  }

  return (
    <div className="demo-page">
      <aside className="demo-controls" aria-label="M02 demo controls">
        <div>
          <strong>M02 Controls</strong>
          <span>Local onboarding tools</span>
        </div>
        <PrimaryButton onClick={createMockRoom}>Create Mock Room</PrimaryButton>
        <SecondaryButton onClick={resetOnboarding}>Reset Onboarding</SecondaryButton>
      </aside>
      <GameShell variant="onboarding">
        <WelcomeHero />
      </GameShell>
    </div>
  );
}
