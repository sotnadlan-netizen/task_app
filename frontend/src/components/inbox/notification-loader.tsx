"use client";

import { useEffect, useCallback } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useOrganization } from "@/providers/organization-provider";
import { useRealtime } from "@/providers/realtime-provider";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@/types";

/**
 * Invisible component that loads and subscribes to notifications.
 * Mounted once in the dashboard layout.
 */
export function NotificationLoader() {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const { subscribe } = useRealtime();
  const { setNotifications, addNotification } = useNotificationStore();

  const load = useCallback(async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("org_id", currentOrg.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setNotifications(data as Notification[]);
  }, [supabase, currentOrg, setNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = subscribe("notifications", (payload) => {
      if (payload.eventType === "INSERT") {
        addNotification(payload.new as unknown as Notification);
      }
    });
    return unsub;
  }, [subscribe, addNotification]);

  return null;
}
