import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      global: {
        fetch: (input, init = {}) => {
          const headers = new Headers(init.headers);
          const localPlayerId =
            typeof window === "undefined"
              ? null
              : window.localStorage.getItem("nofold_player_id");

          if (localPlayerId) {
            headers.set("x-nofold-player-id", localPlayerId);
          }

          return fetch(input, { ...init, headers });
        },
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
}
