import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

/**
 * Accessibility Statement page — Israeli Standard IS 5568 / WCAG 2.1 AA
 * Route: /accessibility (public — no auth required)
 */
export default function AccessibilityStatement() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" lang="he" className="min-h-[100dvh] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5 text-slate-600 dark:text-slate-400"
        >
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          חזרה
        </Button>
        <h1 className="text-base font-bold">הצהרת נגישות</h1>
      </header>

      {/* Content */}
      <main id="main-content" tabIndex={-1} className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        <section className="space-y-2">
          <h2 className="text-xl font-bold">הצהרת נגישות — Advisor AI</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">עדכון אחרון: אפריל 2026</p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">כללי</h3>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Advisor AI מחויבת להנגיש את שירותיה לכלל המשתמשים, לרבות אנשים עם מוגבלות, בהתאם להוראות חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח–1998, והתקנות שהותקנו מכוחו.
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            אתר זה עומד בדרישות תקן ישראלי 5568 (IS 5568) ברמת נגישות AA, המבוסס על הנחיות WCAG 2.1 מטעם W3C.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">רכיבי נגישות קיימים</h3>
          <ul className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside">
            <li>ניגודיות גבוהה — עמידה בדרישות WCAG 1.4.3 (יחס ניגודיות 4.5:1)</li>
            <li>הגדלת טקסט עד 200% ללא פגיעה בתוכן</li>
            <li>ניווט מקלדת מלא — כל האלמנטים נגישים דרך Tab</li>
            <li>טבעת פוקוס ברורה על אלמנטים אינטראקטיביים</li>
            <li>תמיכה מלאה ב-RTL (כתיבה מימין לשמאל) לשפה העברית</li>
            <li>תגיות ARIA על כל הרכיבים הדינמיים</li>
            <li>טקסט חלופי (alt) על כל תמונות</li>
            <li>פסיקת אנימציות לבטיחות אפילפסיה</li>
            <li>גופן קריא (Assistant / Arial)</li>
            <li>קפיצה לתוכן הראשי (Skip Navigation)</li>
            <li>כפתור נגישות צף עם תפריט מלא (IS 5568)</li>
            <li>גווני אפור לנגישות עיוורי צבעים</li>
            <li>סמן גדול ומוגדל</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">תמיכה בטכנולוגיות מסייעות</h3>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            האתר נבדק עם קוראי מסך מובילים (NVDA, VoiceOver) ותומך בשימוש עם מקלדת בלבד. פריסת העמוד מבוססת על Landmark Regions תקניים: <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">main</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">nav</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">header</code>.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">יצירת קשר בנושא נגישות</h3>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            אם נתקלת בבעיית נגישות כלשהי או ברצונך להגיש בקשה להנגשה, ניתן לפנות אלינו:
          </p>
          <address className="text-sm not-italic text-slate-700 dark:text-slate-300 space-y-1">
            <p>רכז/ת הנגישות: צוות Advisor AI</p>
            <p>
              דוא"ל:{" "}
              <a
                href="mailto:accessibility@advisorai.co.il"
                className="text-indigo-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 rounded"
              >
                accessibility@advisorai.co.il
              </a>
            </p>
          </address>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            אנו מתחייבים להשיב לפניות נגישות תוך 5 ימי עסקים.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">מגבלות ידועות</h3>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            תוכן מסוים המוצג ממקורות צד שלישי (כגון גרפים מ-Recharts) עשוי להיות בעל נגישות מוגבלת. אנו פועלים לשיפור מתמיד.
          </p>
        </section>

        <section className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400">
            הצהרה זו נערכה בהתאם להנחיות רשות הנגישות הישראלית ותעודכן אחת לשנה או בעת שינויים מהותיים בנגישות האתר.
          </p>
        </section>
      </main>
    </div>
  );
}
