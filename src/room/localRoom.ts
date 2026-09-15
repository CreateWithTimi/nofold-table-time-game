import { tableTroublePack } from "../data/packs/table-trouble";
import { selectNextJudge } from "../game/engine/selectJudge";
import type { Player } from "../game/types/player";
import type { RoomPlayer, RoomState, RoomStatus } from "./types";

const STORAGE_KEY = "no-fold:m02-room";
const MOCK_ROOM_CODE = "NF42";
const MAX_PLAYERS = 6;

const mockNames = ["Ada", "Kelechi", "Emeka"];

export function generateRoomCode() {
  return MOCK_ROOM_CODE;
}

export function createLocalRoom(nickname: string): RoomState {
  const host: RoomPlayer = {
    id: slugName(nickname) || "host",
    name: normalizeName(nickname),
    isHost: true,
  };

  return saveRoom({
    code: generateRoomCode(),
    hostPlayerId: host.id,
    players: [host],
    selectedPackId: null,
    status: "LOBBY",
    currentViewerId: host.id,
    roundNumber: 1,
    judgeId: null,
  });
}

export function joinLocalRoom(code: string, nickname: string): RoomState | null {
  const room = loadRoom();

  if (!room || room.code !== code.trim().toUpperCase()) {
    return null;
  }

  const name = normalizeName(nickname);
  const existing = room.players.find((player) => player.name.toLowerCase() === name.toLowerCase());
  const player = existing ?? {
    id: uniquePlayerId(room.players, slugName(name)),
    name,
    isHost: false,
  };

  return saveRoom({
    ...room,
    players: existing || room.players.length >= MAX_PLAYERS ? room.players : [...room.players, player],
    currentViewerId: player.id,
  });
}

export function loadRoom(): RoomState | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as RoomState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveRoom(room: RoomState): RoomState {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(room));
  return room;
}

export function resetRoom() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function setViewer(room: RoomState, playerId: string): RoomState {
  return saveRoom({ ...room, currentViewerId: playerId });
}

export function setRoomStatus(room: RoomState, status: RoomStatus): RoomState {
  return saveRoom({ ...room, status });
}

export function selectPack(room: RoomState): RoomState {
  return saveRoom({ ...room, selectedPackId: tableTroublePack.id, status: "GAME_READY" });
}

export function startJudgeSelection(room: RoomState): RoomState {
  const judgeId = selectNextJudge(toGamePlayers(room.players), []);
  return saveRoom({ ...room, status: "JUDGE_SELECTION", judgeId });
}

export function startGame(room: RoomState): RoomState {
  return saveRoom({ ...room, status: "IN_GAME" });
}

export function addMockPlayer(room: RoomState, name?: string): RoomState {
  if (room.players.length >= MAX_PLAYERS) {
    return room;
  }

  const nextName = name ?? mockNames.find((candidate) => !room.players.some((player) => player.name === candidate));

  if (!nextName) {
    return room;
  }

  const player: RoomPlayer = {
    id: uniquePlayerId(room.players, slugName(nextName)),
    name: nextName,
    isHost: false,
  };

  return saveRoom({ ...room, players: [...room.players, player] });
}

export function removeMockPlayer(room: RoomState): RoomState {
  const removable = [...room.players].reverse().find((player) => !player.isHost);

  if (!removable) {
    return room;
  }

  const players = room.players.filter((player) => player.id !== removable.id);
  const currentViewerId = room.currentViewerId === removable.id ? room.hostPlayerId : room.currentViewerId;

  return saveRoom({ ...room, players, currentViewerId });
}

export function getCurrentViewer(room: RoomState) {
  return room.players.find((player) => player.id === room.currentViewerId) ?? room.players[0];
}

export function canHostStart(room: RoomState) {
  return room.players.length >= 3;
}

function normalizeName(name: string) {
  return name.trim().slice(0, 18) || "Player";
}

function slugName(name: string) {
  return normalizeName(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function uniquePlayerId(players: RoomPlayer[], base: string) {
  let id = base || "player";
  let index = 2;

  while (players.some((player) => player.id === id)) {
    id = `${base}-${index}`;
    index += 1;
  }

  return id;
}

function toGamePlayers(players: RoomPlayer[]): Player[] {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    score: 0,
    isHost: player.isHost,
  }));
}
