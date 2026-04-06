import { useEffect } from "react";
import { supabase } from "@/core/api/supabaseClient";
import type { ActionItem } from "@/core/utils/storage";

/**
 * Subscribes to Supabase Realtime on the `tasks` table, filtered by sessionId.
 * On INSERT  → appends the new task.
 * On UPDATE  → merges changed fields into the matching task.
 * On DELETE  → removes the task.
 */
export function useRealtimeTasks(
  sessionId: string | undefined,
  setTasks: React.Dispatch<React.SetStateAction<ActionItem[]>>,
) {
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`realtime:tasks:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "tasks",
          filter: `session_id=eq.${sessionId}`,
        },
        ({ new: row }) => {
          const task: ActionItem = {
            id:          row.id,
            sessionId:   row.session_id,
            createdAt:   row.created_at,
            title:       row.title,
            description: row.description || "",
            assignee:    row.assignee,
            priority:    row.priority,
            completed:   row.completed,
          };
          // Avoid duplicates (optimistic updates may have already added it)
          setTasks((prev) =>
            prev.some((t) => t.id === task.id) ? prev : [...prev, task],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "tasks",
          filter: `session_id=eq.${sessionId}`,
        },
        ({ new: row }) => {
          setTasks((prev) =>
            prev.map((t) =>
              t.id === row.id
                ? {
                    ...t,
                    title:       row.title,
                    description: row.description || "",
                    assignee:    row.assignee,
                    priority:    row.priority,
                    completed:   row.completed,
                  }
                : t,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event:  "DELETE",
          schema: "public",
          table:  "tasks",
          filter: `session_id=eq.${sessionId}`,
        },
        ({ old: row }) => {
          setTasks((prev) => prev.filter((t) => t.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, setTasks]);
}
