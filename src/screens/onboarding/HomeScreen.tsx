import { Link } from "react-router";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { Panel } from "../../components/cards/Panel";

export function HomeScreen() {
  return (
    <Panel title="NO FOLD">
      <p>
        A social pressure game where the phone deals scenarios, enforces the
        rules, tracks score, and gets out of the conversation's way.
      </p>
      <div className="action-row">
        <Link to="/create">
          <PrimaryButton>Create Room</PrimaryButton>
        </Link>
        <Link to="/join">
          <PrimaryButton>Join Room</PrimaryButton>
        </Link>
      </div>
    </Panel>
  );
}
