// Run with NOFOLD_PGLITE_MODULE pointing to an external @electric-sql/pglite
// installation. No production dependency or live database is used.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.env.NOFOLD_PGLITE_MODULE || "@electric-sql/pglite");

async function main() {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create table rooms (id uuid primary key default gen_random_uuid(), host_player_id uuid,
        status text, selected_pack_id text, updated_at timestamptz default now());
      create table room_players (id uuid primary key default gen_random_uuid(), room_id uuid references rooms(id));
      create table game_sessions (id uuid primary key default gen_random_uuid(),
        room_id uuid references rooms(id), current_round integer default 1, total_rounds integer default 8,
        status text, scenario_order text[], created_at timestamptz default now());
      create unique index game_sessions_one_active_per_room_idx on game_sessions(room_id) where status='ACTIVE';
      create table game_scores (id uuid primary key default gen_random_uuid(), session_id uuid references game_sessions(id),
        room_id uuid references rooms(id), player_id uuid references room_players(id), score integer,
        unique(room_id, player_id), unique(session_id, player_id));
      create table game_rounds (id uuid primary key default gen_random_uuid(), session_id uuid references game_sessions(id),
        room_id uuid references rooms(id), round_number integer, judge_player_id uuid, phase text, flow text,
        defense_order uuid[], current_defender_index integer, scenario_id text, scores_applied_at timestamptz,
        defense_started_at timestamptz, verdict text, winning_player_id uuid,
        unique(room_id, round_number), unique(session_id, round_number));
      create table game_round_responses (session_id uuid, room_id uuid, round_number integer, player_id uuid,
        locked_at timestamptz, unique(room_id, round_number, player_id));
      create table game_round_decisions (session_id uuid, room_id uuid, round_number integer, player_id uuid,
        locked_at timestamptz, unique(room_id, round_number, player_id));
    `);
    const migration = (file) => fs.readFileSync(path.join(__dirname, "../supabase/migrations", file), "utf8");
    await db.exec(migration("20260923120000_m03_6_recovery_guards.sql"));
    const room = (await db.query("insert into rooms(status,selected_pack_id) values ('FINISHED','table-trouble') returning id")).rows[0].id;
    const players = (await db.query("insert into room_players(room_id) select $1::uuid from generate_series(1,3) returning id", [room])).rows.map(x => x.id);
    const [host, judge, other] = players;
    await db.query("update rooms set host_player_id=$1 where id=$2", [host, room]);
    const old = (await db.query("insert into game_sessions(room_id,current_round,status,scenario_order) values ($1,8,'FINISHED',array['old']) returning id", [room])).rows[0].id;
    await db.query("insert into game_rounds(session_id,room_id,round_number,judge_player_id,phase,scores_applied_at) values ($1,$2,8,$3,'ROUND_RESULT',now()),($1,$2,1,$3,'ROUND_RESULT',now())", [old, room, judge]);
    await db.query("insert into game_scores(session_id,room_id,player_id,score) select $1,$2,id,12 from room_players where room_id=$2", [old, room]);
    const replay = async (session, player=judge, choosePack=false) =>
      (await db.query("select * from replace_finished_session($1,$2,$3,$4,$5,$6)", [room,session,player,host,["new-a","new-b"],choosePack])).rows[0];
    await assert.rejects(replay(old), e => e.code === "23505" && e.constraint === "game_scores_room_id_player_id_key");
    assert.equal((await db.query("select count(*)::int as n from game_sessions")).rows[0].n, 1);
    console.log("PASS: original RPC reproduces live 23505 and rolls back atomically");

    const repair = migration("20260929120000_m03_6_1_replay_constraint_repair.sql");
    await db.exec(repair);
    await db.exec(repair);
    await assert.rejects(replay(old, other), /designated player/);
    const [first, repeated] = await Promise.all([replay(old), replay(old)]);
    assert.equal(first.id, repeated.id);
    assert.equal(first.replaces_session_id, old);
    assert.equal(first.current_round, 1);
    assert.equal(first.status, "ACTIVE");
    const scores = (await db.query("select score from game_scores where session_id=$1", [first.id])).rows;
    assert.equal(scores.length, 3);
    assert.ok(scores.every(x => x.score === 10));
    assert.ok((await db.query("select score from game_scores where session_id=$1", [old])).rows.every(x => x.score === 12));
    const round = (await db.query("select * from game_rounds where session_id=$1", [first.id])).rows[0];
    assert.equal(round.phase, "RESPONSE_SELECTION");
    assert.equal(round.scenario_id, "new-a");
    assert.equal(round.defense_started_at, null);
    assert.equal(round.verdict, null);
    assert.equal(round.flow, null);
    assert.equal((await db.query("select count(*)::int as n from game_round_responses where session_id=$1", [first.id])).rows[0].n, 0);
    assert.equal((await db.query("select count(*)::int as n from game_round_decisions where session_id=$1", [first.id])).rows[0].n, 0);
    await db.query("update game_scores set score=14 where session_id=$1 and player_id=$2", [first.id, host]);
    assert.equal((await replay(old)).id, first.id);
    assert.equal((await db.query("select score from game_scores where session_id=$1 and player_id=$2", [first.id,host])).rows[0].score, 14);
    console.log("PASS: repeated replay returns one session, fresh round/10 points, history preserved, retry never resets scores");

    await db.query("update game_sessions set status='FINISHED' where id=$1", [first.id]);
    await db.query("update game_rounds set phase='ROUND_RESULT', scores_applied_at=now() where session_id=$1", [first.id]);
    await assert.rejects(replay(first.id, other, true), /designated player/);
    const pack = await replay(first.id, host, true);
    const packRetry = await replay(first.id, host, true);
    assert.equal(pack.id, packRetry.id);
    const roomState = (await db.query("select status,selected_pack_id from rooms where id=$1", [room])).rows[0];
    assert.equal(roomState.status, "PACK_SELECTION");
    assert.equal(roomState.selected_pack_id, null);
    assert.equal((await replay(old)).id, first.id);
    assert.equal((await db.query("select count(*)::int as n from game_sessions")).rows[0].n, 3);
    console.log("PASS: host-only pack return, retries and delayed previous replay preserve canonical session chain");
  } finally {
    await db.close();
  }
}
main().catch(error => { console.error(error); process.exitCode=1; });
