/**
 * Lightweight i18n core — no routing, no external deps.
 * The whole UI is either fully English (LTR) or fully Hebrew (RTL); the active
 * language drives both the strings and the document direction.
 */
import { en } from "./messages/en";
import { he } from "./messages/he";

export type Lang = "en" | "he";

export const LANGS: Lang[] = ["en", "he"];
export const DEFAULT_LANG: Lang = "en";
export const STORAGE_KEY = "app-lang";

/** Document direction for a language. */
export function dirFor(lang: Lang): "rtl" | "ltr" {
  return lang === "he" ? "rtl" : "ltr";
}

/** Narrow an arbitrary string to a supported Lang, falling back to the default. */
export function normalizeLang(value: string | null | undefined): Lang {
  return value === "he" || value === "en" ? value : DEFAULT_LANG;
}

export const messages: Record<Lang, typeof en> = { en, he };

/**
 * Resolve a dot-path (e.g. "nav.home") against a message tree and interpolate
 * `{var}` placeholders. Falls back to the raw key when a translation is missing,
 * so a forgotten key is visible rather than crashing.
 */
export function translate(
  lang: Lang,
  path: string,
  vars?: Record<string, string | number>
): string {
  const segments = path.split(".");
  let node: unknown = messages[lang];
  for (const seg of segments) {
    if (node && typeof node === "object" && seg in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[seg];
    } else {
      node = undefined;
      break;
    }
  }

  if (typeof node !== "string") {
    // Fall back to English, then to the key itself.
    if (lang !== "en") return translate("en", path, vars);
    return path;
  }

  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}
