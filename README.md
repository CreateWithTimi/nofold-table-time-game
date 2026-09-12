# NO FOLD

NO FOLD is a multiplayer social pressure game. Players receive awkward scenarios
and private response cards, defend their chosen response, then decide whether to
CALL or FOLD. The phone deals, referees, tracks score, and applies pressure while
the table conversation stays central.

## Current Milestone

M01 adds the first static playable UI on top of the M00 engineering foundation.
It proves one complete local/mock round can move through the intended NO FOLD
flow in a browser.

## Stack

- Vite
- React
- TypeScript
- React Router

## Architecture Philosophy

The game engine is independent from the UI. React components render state and send
player actions, but React does not decide rules.

Rules owned by `src/game/engine` include:

- round phase
- Judge selection and rotation
- response dealing
- locked responses
- defense order
- CALL / FOLD decisions
- scoring
- Stand Alone logic
- Coward Round logic
- No Escape logic
- next round transitions

Canonical phases, scoring constants, game types, and content types are centralized
under `src/game`.

## M01 Demo

Run the app and open `/demo`.

The demo controls sit outside the mobile game frame and let you:

- view the round as Timi, Zara, Miko, or Ada the Judge
- force the normal 2+ CALL path
- force the Stand Alone path
- force the Coward Round and No Escape path
- reset the local demo round

No backend, realtime service, authentication, Rive, sound, analytics, payments,
or restaurant systems are included.

## Future Realtime Plan

Supabase and realtime sync are intentionally excluded from M00. Later milestones
can persist `GameState`, broadcast player actions, and reconcile room state around
the pure engine functions created here.

## Future Rive Plan

Rive is presentation-only. It may animate phases and pressure moments later, but
it must never decide scores, winners, callers, Judge selection, outcomes, or game
phase logic.

## Commands

```bash
npm install
npm run dev
npm run build
```
