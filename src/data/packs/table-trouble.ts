import type { GamePack, Scenario } from "../../game/types/content";

export const tableTroublePack: GamePack = {
  id: "table-trouble",
  name: "Table Trouble",
  description: "Awkward dinner-table choices for early NO FOLD playtests.",
  scenarioIds: ["split-the-bill", "mystery-plus-one", "toast-gone-wrong"],
};

export const tableTroubleScenarios: Scenario[] = [
  {
    id: "split-the-bill",
    packId: tableTroublePack.id,
    text: "The table bill arrives and one friend casually says everyone should split evenly, despite ordering twice as much as everyone else.",
    responses: [
      { id: "split-01", text: "Suggest everyone pays for exactly what they ordered.", tone: "SENSIBLE" },
      { id: "split-02", text: "Pay evenly but loudly announce this is your final act of friendship.", tone: "RISKY" },
      { id: "split-03", text: "Ask the server to bring an itemized emotional damage receipt.", tone: "CHAOTIC" },
      { id: "split-04", text: "Offer to pay if everyone admits who they secretly dislike at the table.", tone: "WILDCARD" },
      { id: "split-05", text: "Quietly cover the difference and move on.", tone: "SENSIBLE" },
      { id: "split-06", text: "Make the big spender defend every appetizer in court.", tone: "RISKY" },
      { id: "split-07", text: "Start an auction for who gets stuck with dessert.", tone: "CHAOTIC" },
      { id: "split-08", text: "Propose the highest earner pays based on vibes.", tone: "WILDCARD" },
    ],
    twists: [
      { id: "split-twist-01", text: "The friend is celebrating a terrible week." },
      { id: "split-twist-02", text: "Someone already paid the deposit and forgot to mention it." },
    ],
  },
  {
    id: "mystery-plus-one",
    packId: tableTroublePack.id,
    text: "Your friend brings an uninvited plus-one to a reservation where the table is already too small.",
    responses: [
      { id: "plus-01", text: "Ask the host whether the reservation can be adjusted.", tone: "SENSIBLE" },
      { id: "plus-02", text: "Tell the plus-one they are now responsible for group morale.", tone: "RISKY" },
      { id: "plus-03", text: "Declare a chair survival tournament.", tone: "CHAOTIC" },
      { id: "plus-04", text: "Give up your seat but narrate it like a heroic sacrifice.", tone: "WILDCARD" },
      { id: "plus-05", text: "Pull your friend aside and ask why they changed the plan.", tone: "SENSIBLE" },
      { id: "plus-06", text: "Make the friend explain the plus-one's origin story to everyone.", tone: "RISKY" },
      { id: "plus-07", text: "Build a new seating chart using salt shakers and threats.", tone: "CHAOTIC" },
      { id: "plus-08", text: "Say the plus-one can stay only if they choose the first toast.", tone: "WILDCARD" },
    ],
    twists: [
      { id: "plus-twist-01", text: "The plus-one knows the restaurant owner." },
      { id: "plus-twist-02", text: "The friend thought you invited them." },
    ],
  },
  {
    id: "toast-gone-wrong",
    packId: tableTroublePack.id,
    text: "Someone asks you to give a toast with ten seconds of warning, and the room gets quiet.",
    responses: [
      { id: "toast-01", text: "Keep it short, kind, and focused on the occasion.", tone: "SENSIBLE" },
      { id: "toast-02", text: "Open with a joke about how unprepared you are.", tone: "RISKY" },
      { id: "toast-03", text: "Ask everyone to raise a glass to surviving the seating plan.", tone: "CHAOTIC" },
      { id: "toast-04", text: "Make the toast a dramatic apology to the bread basket.", tone: "WILDCARD" },
      { id: "toast-05", text: "Compliment the guest of honor and sit down fast.", tone: "SENSIBLE" },
      { id: "toast-06", text: "Reveal one harmless but embarrassing memory.", tone: "RISKY" },
      { id: "toast-07", text: "Start a chant and hope confidence fills the gaps.", tone: "CHAOTIC" },
      { id: "toast-08", text: "Hand the toast to the person who made eye contact first.", tone: "WILDCARD" },
    ],
    twists: [
      { id: "toast-twist-01", text: "The guest of honor's parents are recording." },
      { id: "toast-twist-02", text: "You just learned two guests broke up today." },
    ],
  },
];
