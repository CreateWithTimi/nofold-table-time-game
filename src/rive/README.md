# Rive Integration Boundary

Rive is intentionally not integrated in M00.

Future Rive files may consume presentation state from React, such as the current
game phase, timers, or revealed round moments. Rive must remain presentation-only.

The TypeScript game engine is authoritative for:

- scores
- winners
- number of callers
- Judge selection
- round outcome
- phase transitions

Example future flow:

1. Game engine resolves `phase = COWARD_ROUND`.
2. React renders the Coward Round screen from game state.
3. Rive receives the phase and plays a Coward Round animation.
