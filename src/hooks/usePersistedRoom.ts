import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useRecoveryRefresh } from "./useRecoveryRefresh";
import { getRoomByCode } from "../services/rooms";
import type { RoomState } from "../room/types";

export type RealtimeConnectionState = "CONNECTING" | "SUBSCRIBED" | "ERROR";

export function usePersistedRoom(roomCode?: string) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>("CONNECTING");

  const refresh = useCallback(async (options: { showLoading?: boolean } = {}) => {
    const { showLoading = true } = options;

    if (!roomCode) {
      setRoom(null);
      setError("Room code is missing.");
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setError("");

    try {
      const nextRoom = await getRoomByCode(roomCode);
      setRoom(nextRoom);
    } catch (caught) {
      console.error("NO FOLD room refresh failed", caught);
      setError("Could not sync the table. Try again.");
      if (showLoading) {
        setRoom(null);
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [roomCode]);
  const recover = useCallback(() => refresh({ showLoading: false }), [refresh]);
  useRecoveryRefresh(recover);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !room?.persistedRoomId) {
      setRealtimeStatus(supabase ? "CONNECTING" : "ERROR");
      return;
    }

    const client = supabase;
    const roomId = room.persistedRoomId;
    let isDisposed = false;

    setRealtimeStatus("CONNECTING");

    const channel = client
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        () => {
          void refresh({ showLoading: false });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => {
          void refresh({ showLoading: false });
        },
      )
      .subscribe((status, err) => {
        if (isDisposed) {
          return;
        }

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("SUBSCRIBED");
          void refresh({ showLoading: false });
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn("NO FOLD room realtime subscription issue", { roomId, status, err });
          setRealtimeStatus("ERROR");
        }
      });

    return () => {
      isDisposed = true;
      void client.removeChannel(channel);
    };
  }, [refresh, room?.persistedRoomId]);

  return { room, setRoom, isLoading, error, refresh, realtimeStatus };
}
