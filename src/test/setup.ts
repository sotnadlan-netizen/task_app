import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock react-i18next so component tests don't need a full i18n provider
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "priority.high":   "גבוהה",
        "priority.medium": "בינונית",
        "priority.low":    "נמוכה",
        "priority.highLabel":   "High — גבוהה",
        "priority.mediumLabel": "Medium — בינונית",
        "priority.lowLabel":    "Low — נמוכה",
        "signup.providerRole":          "יועץ / ספק",
        "signup.clientRole":            "לקוח",
        "agentConfig.promptPlaceholder": "הזן הוראות לסוכן ה-AI...",
        "dashboard.privacyNotice":       "🔐 השיחה עובדה ונמחקה לצמיתות מטעמי פרטיות",
      };
      return map[key] ?? key;
    },
    i18n: { changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty" as const, init: vi.fn() },
}));

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  });
}
