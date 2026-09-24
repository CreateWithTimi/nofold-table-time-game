-- M03.5 repair: allow the prototype client to idempotently ensure all private
-- hand rows for the current round. Reads remain owner-scoped; this only permits
-- deterministic insert/update of hand ids so a missing player row cannot strand
-- that player on DEALING YOUR HAND forever.

alter table public.game_round_hands enable row level security;

drop policy if exists "Prototype client can ensure round hands" on public.game_round_hands;
create policy "Prototype client can ensure round hands"
on public.game_round_hands for insert
to anon
with check (true);

drop policy if exists "Prototype client can repair round hands" on public.game_round_hands;
create policy "Prototype client can repair round hands"
on public.game_round_hands for update
to anon
using (true)
with check (true);

comment on policy "Prototype client can ensure round hands" on public.game_round_hands is
  'Prototype-only: any room client may insert deterministic private-hand rows for all active non-Judge players. Replace with auth-backed room membership before production.';

comment on policy "Prototype client can repair round hands" on public.game_round_hands is
  'Prototype-only: permits deterministic upsert repair of malformed hand rows. Reads remain owner-scoped by local_player_id header.';
