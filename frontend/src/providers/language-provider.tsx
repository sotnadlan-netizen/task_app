"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  DEFAULT_LANG,
  STORAGE_KEY,
  dirFor,
  normalizeLang,
  translate,
  type Lang,
} from "@/lib/i18n";

interface LanguageContextType {
  lang: Lang;
  dir: "rtl" | "ltr";
  /** Translate a dot-path key, with optional {var} interpolation. */
  t: (path: string, vars?: Record<string, string | number>) => string;
  /** Change the active language (writes localStorage + updates <html>). */
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** Apply language to the document element (lang + dir). */
function applyToDocument(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dirFor(lang);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // SSR-safe: start from the default so the server and first client render agree,
  // then reconcile with the persisted choice in the effect below.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
    const initial = normalizeLang(stored);
    setLangState(initial);
    applyToDocument(initial);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    applyToDocument(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translate(lang, path, vars),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, dir: dirFor(lang), t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
