import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Session } from "@/lib/storage";

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
    const channel = supabase
      .channel("realtime:sessions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sessions" },
        ({ new: row }) => {
          // Only apply if it belongs to the current user's scope
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
        { event: "UPDATE", schema: "public", table: "sessions" },
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
        { event: "DELETE", schema: "public", table: "sessions" },
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
