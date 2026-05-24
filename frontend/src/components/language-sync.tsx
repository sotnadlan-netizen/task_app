"use client";

/**
 * Bridges the per-user language preference (profiles.language) with the
 * device-level LanguageProvider. Mount inside SupabaseProvider.
 *
 * - On login: loads the user's saved language and applies it.
 * - On change: when a logged-in user switches language, persists it to the
 *   profile via the backend (mutations go through FastAPI, per CLAUDE.md).
 */

import { useEffect, useRef } from "react";
import { useSupabase } from "@/providers/supabase-provider";
import { useLanguage } from "@/providers/language-provider";
import { api } from "@/lib/api";
import { normalizeLang, type Lang } from "@/lib/i18n";

export function LanguageSync() {
  const { supabase, user, session } = useSupabase();
  const { lang, setLang } = useLanguage();

  // The language we know is stored on the server, to avoid echoing a freshly
  // loaded value straight back as an update.
  const serverLang = useRef<Lang | null>(null);
  const loadedForUser = useRef<string | null>(null);

  // Load the saved language once per user.
  useEffect(() => {
    if (!user) {
      loadedForUser.current = null;
      serverLang.current = null;
      return;
    }
    if (loadedForUser.current === user.id) return;
    loadedForUser.current = user.id;

    supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const saved = normalizeLang(data?.language);
        serverLang.current = saved;
        if (saved !== lang) setLang(saved);
      });
  }, [user, supabase, lang, setLang]);

  // Persist deliberate changes by a logged-in user.
  useEffect(() => {
    if (!user || !session?.access_token) return;
    if (serverLang.current === null) return; // initial load not done yet
    if (lang === serverLang.current) return; // nothing changed
    serverLang.current = lang;
    api.updateProfileLanguage(lang, session.access_token).catch(() => {
      // Non-fatal: the choice is still saved in localStorage.
    });
  }, [lang, user, session]);

  return null;
}
