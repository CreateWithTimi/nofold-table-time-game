export type ResponseTone = "SENSIBLE" | "RISKY" | "CHAOTIC" | "WILDCARD";

export interface ResponseCard {
  id: string;
  text: string;
  tone: ResponseTone;
}

export interface Twist {
  id: string;
  text: string;
}

export interface Scenario {
  id: string;
  packId: string;
  text: string;
  responses: ResponseCard[];
  twists: Twist[];
}

export interface GamePack {
  id: string;
  name: string;
  description: string;
  scenarioIds: string[];
}
