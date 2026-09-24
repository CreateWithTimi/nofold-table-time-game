-- M03.5 hotfix: repair prototype RLS for deterministic round-hand dealing.
--
-- ensureRoundHands(...) upserts hand rows for every active non-Judge player in
-- the round. The original owner-only INSERT policy blocks that multi-player
-- write path because some rows necessarily belong to other local_player_id
-- values. Keep SELECT owner-scoped, but allow prototype anon clients to insert
-- and update canonical hand rows until auth-backed room membership policies are
-- introduced.

alter table public.game_round_hands enable row level security;

grant select, insert, update on table public.game_round_hands to anon, authenticated;

drop policy if exists "Prototype local player can read own round hand" on public.game_round_hands;
create policy "Prototype local player can read own round hand"
on public.game_round_hands for select
to anon, authenticated
using (
  local_player_id = coalesce(
    nullif(current_setting('request.headers', true)::jsonb ->> 'x-nofold-player-id', ''),
    '__missing__'
  )
);

drop policy if exists "Prototype local player can create own round hand" on public.game_round_hands;
drop policy if exists "Prototype client can ensure round hands" on public.game_round_hands;
drop policy if exists "Prototype client can repair round hands" on public.game_round_hands;
drop policy if exists "Prototype anon can insert round hands" on public.game_round_hands;
drop policy if exists "Prototype anon can update round hands" on public.game_round_hands;

create policy "Prototype anon can insert round hands"
on public.game_round_hands for insert
to anon, authenticated
with check (true);

create policy "Prototype anon can update round hands"
on public.game_round_hands for update
to anon, authenticated
using (true)
with check (true);

comment on policy "Prototype local player can read own round hand" on public.game_round_hands is
  'Prototype privacy: clients may only SELECT private hands matching their x-nofold-player-id header. This header is spoofable and must be replaced with auth-backed membership before production.';

comment on policy "Prototype anon can insert round hands" on public.game_round_hands is
  'Prototype-only: allows deterministic ensureRoundHands upserts to create private-hand rows for all active non-Judge players. Not production-safe without auth-backed room membership.';

comment on policy "Prototype anon can update round hands" on public.game_round_hands is
  'Prototype-only: allows deterministic ensureRoundHands upserts to repair existing hand rows. SELECT remains owner-scoped.';
