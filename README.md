# NO FOLD

NO FOLD is a multiplayer social pressure game. Players receive awkward scenarios
and private response cards, defend their chosen response, then decide whether to
CALL or FOLD. The phone deals, referees, tracks score, and applies pressure while
the table conversation stays central.

## Current Milestone

M02 adds onboarding and pre-game room flow on top of the M00/M01 foundation.
It proves a local user can move from welcome to room creation, lobby, pack
selection, game ready, Judge selection, and Round 1 handoff.

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

## M02 Onboarding Demo

Use the normal routes:

- `/` welcome / QR entry
- `/create` create a local table
- `/join` join the local demo room
- `/room/NF42` lobby, pack selection, game ready, and Judge selection
- `/game/NF42` handoff into the existing M01 round UI

Room state is stored in `localStorage` for M02 only. This avoids refresh crashes
while keeping the implementation local and mock-only.

The demo controls sit outside the phone frame. From `/`, create or reset a mock
room. From `/room/NF42`, add/remove mock players, switch host/player view, and
force lobby, pack selection, game ready, or Judge selection.

## Future QR Architecture

Production QR flow should be:

1. Venue or table QR opens NO FOLD entry.
2. A host creates a temporary room for that group.
3. The temporary room gets its own room code and join QR.
4. Friends join that temporary room.

A permanent restaurant QR must not represent one permanent shared game room.
Different groups scanning the same venue QR should never collide into one
session.

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
