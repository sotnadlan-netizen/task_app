import { useEffect } from "react";
import { supabase } from "@/core/api/supabaseClient";
import type { Session } from "@/core/utils/storage";

/**
 * Subscribes to Supabase Realtime on the `sessions` table.
 * On INSERT  → prepends the new session to state.
 * On UPDATE  → merges changed fields into the matching session.
 * On DELETE  → removes the session from state.
 *
 * The caller provides setter functions so this hook stays stateless
 * and can be dropped into any component that already owns the sessions array.
 */
export function useRealtimeSessions(
  setSessions: React.Dispatch<React.SetStateAction<Session[]>>,
  /** Optional: restrict updates to sessions owned by this provider ID */
  providerId?: string | null,
  /** Optional: restrict updates to sessions assigned to this client email */
  clientEmail?: string | null,
) {
  useEffect(() => {
    // Build a server-side filter so Supabase only broadcasts rows this user owns.
    // This is defence-in-depth on top of RLS — prevents leakage even if RLS has a gap.
    const serverFilter = providerId
      ? `provider_id=eq.${providerId}`
      : clientEmail
      ? `client_email=eq.${clientEmail}`
      : undefined;

    // Use a unique channel name per user to prevent channel sharing across accounts.
    const channelName = `realtime:sessions:${providerId ?? clientEmail ?? "anon"}`;

    const channel = supabase
      // private: true ensures this channel is access-controlled by RLS.
      // Without this, any authenticated user could subscribe to any channel name.
      .channel(channelName, { config: { private: true } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sessions", filter: serverFilter },
        ({ new: row }) => {
          // Client-side guard as a second layer
          if (providerId && row.provider_id !== providerId) return;
          if (clientEmail && row.client_email !== clientEmail) return;

          const session: Session = {
            id:             row.id,
            createdAt:      row.created_at,
            filename:       row.filename,
            summary:        row.summary || "",
            providerId:     row.provider_id || null,
            clientEmail:    row.client_email || null,
            audioUrl:       row.audio_url || null,
            taskCount:      0,
            completedCount: 0,
          };
          setSessions((prev) => [session, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: serverFilter },
        ({ new: row }) => {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === row.id
                ? {
                    ...s,
                    filename:    row.filename,
                    summary:     row.summary || "",
                    clientEmail: row.client_email || null,
                    audioUrl:    row.audio_url || null,
                  }
                : s,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "sessions", filter: serverFilter },
        ({ old: row }) => {
          setSessions((prev) => prev.filter((s) => s.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [setSessions, providerId, clientEmail]);
}
