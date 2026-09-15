import { useEffect, useState } from "react";
import { loadRoom, saveRoom } from "../room/localRoom";
import type { RoomState } from "../room/types";

export function useLocalRoom() {
  const [room, setRoomState] = useState<RoomState | null>(() => loadRoom());

  useEffect(() => {
    const onStorage = () => setRoomState(loadRoom());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function setRoom(nextRoom: RoomState | null) {
    if (nextRoom) {
      saveRoom(nextRoom);
    }
    setRoomState(nextRoom);
  }

  return [room, setRoom] as const;
}
