import { Link } from "react-router";
import { PrimaryButton } from "../game/Buttons";

export function RoomNotFound() {
  return (
    <>
      <div className="section-headline">
        <p className="eyebrow">Room not found</p>
        <h1>Return home</h1>
        <p>This room could not be found or Supabase is not configured.</p>
      </div>
      <Link to="/">
        <PrimaryButton>Return Home</PrimaryButton>
      </Link>
    </>
  );
}
