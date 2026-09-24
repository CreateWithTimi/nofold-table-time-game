const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");

function load(file, mocks = {}, globals = {}) {
  const filename = path.join(root, file);
  const js = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (!id.startsWith(".")) return require(id);
    const base = path.resolve(path.dirname(filename), id);
    const target = fs.existsSync(base + ".ts") ? base + ".ts" : path.join(base, "index.ts");
    return load(path.relative(root, target), mocks, globals);
  };
  vm.runInNewContext(js, { module, exports: module.exports, require: localRequire, console, ...globals }, { filename });
  return module.exports;
}

function clientRecorder() {
  const calls = [];
  const query = {};
  for (const method of ["from", "update", "eq", "is", "not", "lte", "select"]) {
    query[method] = (...args) => { calls.push([method, ...args]); return query; };
  }
  query.maybeSingle = async () => ({ data: null, error: null });
  return { calls, query };
}

for (const [file, action, extra] of [
  ["startDefenseTimer", "startDefenseTimer", { currentDefenderIndex: 1 }],
  ["advanceDefenseTurn", "advanceDefenseTurn", { currentDefenderIndex: 1, defenseOrderLength: 3 }],
  ["standAlone", "startStandAloneDefense", { playerId: "player" }],
  ["standAlone", "completeStandAloneDefense", { playerId: "player" }],
  ["standAlone", "resolveStandAloneVerdict", { judgePlayerId: "judge", standAlonePlayerId: "player", survived: true }],
  ["noEscape", "completeNoEscapeDefense", { noEscapePlayerId: "player" }],
  ["noEscape", "resolveNoEscapeVerdict", { judgePlayerId: "judge", noEscapePlayerId: "player", survived: false }],
]) {
  test(action + " scopes a losing race and its canonical refetch to the same session", async () => {
    const { calls, query } = clientRecorder();
    let fallback;
    const services = load("src/services/rounds/" + file + ".ts", {
      "../../lib/supabase": { requireSupabase: () => query },
      "./getPersistedRound": { getPersistedRound: async (...args) => { fallback = args; return { id: "canonical" }; } },
    });
    await services[action]({ roundId: "round", roomId: "room", sessionId: "replay", roundNumber: 3, ...extra });
    assert.ok(calls.some(([method, key, value]) => method === "eq" && key === "session_id" && value === "replay"));
    assert.deepEqual(fallback, ["room", 3, "replay"]);
  });
}

test("a stale NEXT ROUND cannot advance a replay at the same round number", async () => {
  let writes = 0;
  const service = load("src/services/gameSessions/advanceRound.ts", {
    "../../lib/supabase": { requireSupabase: () => { writes++; throw new Error("unexpected write"); } },
    "../rounds": { getPersistedRound: async () => ({ session_id: "old", phase: "ROUND_RESULT" }) },
    "./session": { getGameSession: async () => ({ id: "new", current_round: 1, status: "ACTIVE" }) },
  });
  await assert.rejects(service.advanceToNextRound({ roomId: "room", sessionId: "old", roundNumber: 1 }), /earlier session/);
  assert.equal(writes, 0);
});

test("replay sends the completed session identity to the atomic operation", async () => {
  let invocation;
  const service = load("src/services/gameSessions/replay.ts", {
    "../../lib/supabase": { requireSupabase: () => ({
      rpc: (...args) => {
        invocation = args;
        return { single: async () => ({ data: { id: "new" }, error: null }) };
      },
    }) },
    "./session": { buildScenarioOrder: () => ["scenario-a", "scenario-b"] },
  });
  const result = await service.restartSession({
    roomId: "room", sessionId: "finished", currentPlayerId: "judge", initialJudgeId: "first",
  });
  assert.equal(result.id, "new");
  assert.equal(invocation[0], "replace_finished_session");
  assert.equal(invocation[1].p_expected_session_id, "finished");
  assert.equal(invocation[1].p_choose_pack, false);
});

test("recovery refetches on resume and removes all listeners on unmount", async () => {
  const listeners = new Map();
  let cleanup, interval, cleared = false, refreshes = 0;
  const events = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const doc = { ...events, visibilityState: "visible" };
  const nav = { onLine: true };
  const hook = load("src/hooks/useRecoveryRefresh.ts", {
    react: { useEffect: (effect) => { cleanup = effect(); } },
  }, {
    document: doc, navigator: nav,
    window: { ...events, setInterval: (fn) => { interval = fn; return 1; }, clearInterval: () => { cleared = true; } },
  });
  hook.useRecoveryRefresh(async () => { refreshes++; });
  listeners.get("online")();
  listeners.get("visibilitychange")();
  interval();
  assert.equal(refreshes, 3);
  nav.onLine = false;
  interval();
  assert.equal(refreshes, 3);
  cleanup();
  assert.equal(listeners.size, 0);
  assert.equal(cleared, true);
});
