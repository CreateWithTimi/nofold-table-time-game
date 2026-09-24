# M03.6 reliability pass

## Verification

- `node --test tests/reliability.test.cjs`: 10/10 pass.
- `npm run build`: passes TypeScript and Vite. Vite reports the existing large-chunk warning.
- Production bundle search: no Test Navigation or M02 Controls labels.
- Tests exercise the actual TypeScript services with mocked transport, plus recovery event/listener cleanup. They do not validate deployed SQL or replace multi-device testing.
- Live browser inspection timed out. The requested three-player stress run, all-phase refresh matrix, network interruption, and replay SQL concurrency test remain unverified.

## Confirmed defects and repairs

1. Normal defense start/advance and Stand Alone/No Escape completion/verdict services had fallback reads without session identity. Reads and update guards now include the supplied session. NEXT ROUND and finish-session writes also use session id; an old result cannot advance a replay.
2. Locked response and CALL/FOLD upserts could overwrite an already committed choice from a stale tab. The migration adds database triggers preserving the existing locked row. Existing validation and private-hand policies remain intact.
3. Bootstrap could mark another client's newly created active session finished. Bootstrap now relies on the one-active-session unique constraint without retiring any active session.
4. Replay and pack return were multi-request writes with a replacement race. They now call a single transactional, SECURITY INVOKER RPC, locking the room and checking the expected completed session. Concurrent calls return the replacement already created. Existing table privileges and RLS still apply.
5. Subscriptions marked themselves connected without recovering missed events. They now refetch on SUBSCRIBED. Recovery also runs on online/visibility events and every 15 seconds while online and visible, with listener cleanup on unmount.
6. Slow fetches could replace newer round data. Round reads use request versions; exposed response, decision, hand, and round data are filtered by current session/round identity. Session snapshots fetch scores and round together before committing.
7. Failed private-hand hydration had no retry action. It now retries through recovery and exposes Try Again with a friendly error. The canonical-hand gate and lock validation remain.
8. Persisted user actions now have a synchronous in-flight guard and disable shared action buttons while pending. Database phase/index guards remain necessary for cross-tab correctness.
9. Finished sessions bypass the private-hand loading gate. Returning to pack selection follows canonical room status for all clients.
10. Timer display is clamped to its duration and zero; normal and Stand Alone completion updates also require an elapsed start timestamp.

## Recovery and limitations

- Reopening retains the existing local browser identity and reloads session, round, role, hands, choices, timestamps, and scores. No new presence or identity system was added.
- A missing required player or Judge can still block progress until they return. No bot replacement or host migration exists. Closing the host does not change ownership.
- The final Judge owns PLAY AGAIN; the host owns TRY ANOTHER PACK and lobby advancement. If that person is absent, that action waits for their return.
- Scores retain the existing atomic score RPC and score-applied guard. This pass does not change scoring rules.
- Replay creates a fresh session, scores at 10, Round 1, and shuffled scenario order. Historical rows remain. Hands/responses/decisions remain session-scoped.
- Realtime transport failures preserve loaded gameplay data and are recovered by refetch. Database/network requests that never settle still depend on transport timeout; no general request cancellation layer was introduced.
- Prototype no-auth authorization remains a limitation. The new RPC deliberately does not elevate database privileges or broaden private SELECT access.

## Migration required before deployment

Apply `supabase/migrations/20260923120000_m03_6_recovery_guards.sql` to live Supabase before using this frontend's replay/pack actions. It adds:

- `preserve_locked_round_choice()` and response/decision update triggers.
- `replace_finished_session(...)`, a SECURITY INVOKER transaction with existing RLS and grants to the existing browser roles.

No live migration was applied by this task.

## Files changed in this pass

- `src/components/game/Buttons.tsx`
- `src/screens/gameplay/GameScreen.tsx`
- `src/hooks/useGameSession.ts`
- `src/hooks/usePersistedRoom.ts`
- `src/hooks/usePersistedRound.ts`
- `src/hooks/useRoundResponses.ts`
- `src/hooks/useRoundDecisions.ts`
- `src/hooks/useRoundHands.ts`
- `src/hooks/useRecoveryRefresh.ts` (new)
- `src/services/rounds/startDefenseTimer.ts`
- `src/services/rounds/advanceDefenseTurn.ts`
- `src/services/rounds/standAlone.ts`
- `src/services/rounds/noEscape.ts`
- `src/services/gameSessions/advanceRound.ts`
- `src/services/gameSessions/session.ts`
- `src/services/gameSessions/replay.ts`
- `supabase/migrations/20260923120000_m03_6_recovery_guards.sql` (new)
- `tests/reliability.test.cjs` (new)
- This report, plus regenerated build output and TypeScript caches.

Other working-tree changes predate this pass and were retained.

## Live acceptance still needed

After applying the migration, run the requested 3-player, 3-round script: repeated response lock, defense refresh, second-tab CALL/FOLD, brief disconnect, Coward verdict refresh, repeated NEXT ROUND, final scoreboard refresh, replay, and pack return. Confirm unchanged scores, one replacement session, preserved locks, private hands, and restored roles. Verify every listed phase on both Judge and player devices before marking the real-table stress pass complete.
