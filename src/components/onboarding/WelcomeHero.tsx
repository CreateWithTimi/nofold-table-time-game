import { Link } from "react-router";
import { PrimaryButton, SecondaryButton } from "../game/Buttons";
import { FooterTagline } from "../game/FooterTagline";

export function WelcomeHero() {
  return (
    <>
      <section className="welcome-hero">
        <div className="brand-mark" aria-label="NO FOLD">
          <span>NO</span>
          <span>F♠LD</span>
        </div>
        <p>Same people. Deeper truths.</p>
      </section>
      <section className="welcome-copy">
        <h1>Put the table on the spot.</h1>
        <p>Bluff. Defend. CALL or FOLD.</p>
      </section>
      <div className="action-stack">
        <Link to="/create">
          <PrimaryButton>Start a Table →</PrimaryButton>
        </Link>
        <Link to="/join">
          <SecondaryButton>Join a Table</SecondaryButton>
        </Link>
        <button className="solo-link" type="button" disabled>
          Playing alone? <span>Solo Mode</span>
        </button>
      </div>
      <FooterTagline />
    </>
  );
}
