const PLAYER_ID_KEY = "nofold_player_id";
const PLAYER_NAME_KEY = "nofold_player_name";

export interface LocalPlayerIdentity {
  id: string;
  name: string | null;
}

export function getOrCreateLocalPlayerIdentity(name?: string): LocalPlayerIdentity {
  const trimmedName = normalizePlayerName(name);
  let id = window.localStorage.getItem(PLAYER_ID_KEY);

  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }

  if (trimmedName) {
    window.localStorage.setItem(PLAYER_NAME_KEY, trimmedName);
  }

  return {
    id,
    name: trimmedName ?? window.localStorage.getItem(PLAYER_NAME_KEY),
  };
}

export function getLocalPlayerIdentity(): LocalPlayerIdentity | null {
  const id = window.localStorage.getItem(PLAYER_ID_KEY);

  if (!id) {
    return null;
  }

  return {
    id,
    name: window.localStorage.getItem(PLAYER_NAME_KEY),
  };
}

export function rememberLocalPlayerName(name: string) {
  const trimmedName = normalizePlayerName(name);

  if (trimmedName) {
    window.localStorage.setItem(PLAYER_NAME_KEY, trimmedName);
  }
}

function normalizePlayerName(name?: string) {
  const trimmed = name?.trim().slice(0, 18);
  return trimmed || null;
}
