"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import { useOrganization } from "./organization-provider";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeCallback = (payload: {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}) => void;

interface RealtimeContextType {
  subscribe: (table: string, callback: RealtimeCallback) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(
  undefined
);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabase();
  const { currentOrg } = useOrganization();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
    };
  }, [supabase, currentOrg?.id]);

  function subscribe(table: string, callback: RealtimeCallback): () => void {
    if (!currentOrg) return () => {};

    const channelKey = `${table}:${currentOrg.id}`;

    if (channelsRef.current.has(channelKey)) {
      supabase.removeChannel(channelsRef.current.get(channelKey)!);
    }

    const channel = supabase
      .channel(channelKey)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `org_id=eq.${currentOrg.id}`,
        },
        (payload) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          });
        }
      )
      .subscribe();

    channelsRef.current.set(channelKey, channel);

    return () => {
      supabase.removeChannel(channel);
      channelsRef.current.delete(channelKey);
    };
  }

  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtime must be used within a RealtimeProvider");
  }
  return context;
}
