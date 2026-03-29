import express from "express";
import { db } from "../services/DatabaseService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

const MOCK_SESSIONS = [
  {
    filename: "ייעוץ_כהן_17-03-2026.mp3",
    summary: "דיון עם משפחת כהן על רכישת דירה ב-2.4 מיליון ₪. המשכנתא המבוקשת: 1.6M. תמהיל מוצע: 60% קבוע, 40% פריים. נדרש אישור עקרוני דחוף לאחר שהלקוח מצא נכס מתאים.",
    daysAgo: 1,
    tasks: [
      { title: "בדיקת ריביות עדכניות לפי בנקים", description: "השוואת ריביות בכל הבנקים הגדולים", assignee: "Advisor", priority: "High" },
      { title: "הגשת בקשה לאישור עקרוני", description: "להגיש לפחות ב-2 בנקים", assignee: "Advisor", priority: "High" },
      { title: "איסוף תלושי שכר ל-3 חודשים", description: "של שני בני הזוג", assignee: "Client", priority: "High" },
      { title: "הכנת תמהיל מוצע", description: "60% קבוע, 40% פריים", assignee: "Advisor", priority: "Medium" },
      { title: "הזמנת שמאות לנכס", description: "שמאי מוסכם על הבנק", assignee: "Client", priority: "Medium" },
    ],
  },
  {
    filename: "ייעוץ_לוי_15-03-2026.mp3",
    summary: "פגישה עם דני לוי, זוג צעיר, רוכשים דירה ראשונה ב-1.8 מיליון ₪. זכאים לסיוע ממשרד השיכון. דנו במסלול פריים מלא לטווח קצר.",
    daysAgo: 3,
    tasks: [
      { title: "בדיקת זכאות מהמדינה", description: "משרד השיכון / זוגות צעירים", assignee: "Client", priority: "High" },
      { title: "הכנת תמהיל פריים", description: "ניתוח יתרונות וחסרונות", assignee: "Advisor", priority: "High" },
      { title: "קבלת אישורי הכנסה", description: "תלושים ותדפיסי בנק", assignee: "Client", priority: "Medium" },
      { title: "פגישת המשך לסיכום תמהיל", description: "לקבוע תוך שבוע", assignee: "Advisor", priority: "Low" },
    ],
  },
  {
    filename: "ייעוץ_מזרחי_12-03-2026.mp3",
    summary: "לקוח ותיק – מיחזור משכנתא קיימת. יתרת חוב: 680K ₪. ריבית קיימת 4.2% קבוע. בדיקת כדאיות מעבר לפריים+0.5%.",
    daysAgo: 6,
    tasks: [
      { title: "חישוב עלות מחזור", description: "עמלות פירעון מוקדם ועלות עו\"ד", assignee: "Advisor", priority: "High" },
      { title: "קבלת מסמך יתרת חוב מהבנק", description: "טופס אסמכתא רשמי", assignee: "Client", priority: "High" },
      { title: "השוואת הצעות בנקים", description: "3 בנקים לפחות", assignee: "Advisor", priority: "Medium" },
    ],
  },
  {
    filename: "ייעוץ_פרץ_10-03-2026.mp3",
    summary: "רכישת נכס להשקעה, לא למגורים. הלוואה: 900K ₪. הון עצמי: 40%. הוסבר על מגבלות מימון להשקעות ועל ריביות גבוהות יותר.",
    daysAgo: 8,
    tasks: [
      { title: "עריכת תכנית פיננסית להשקעה", description: "תשואה צפויה vs עלות מימון", assignee: "Advisor", priority: "High" },
      { title: "בדיקת אישור הכנסות משכירות", description: "הוכחת הכנסה פאסיבית", assignee: "Client", priority: "Medium" },
    ],
  },
  {
    filename: "ייעוץ_אברהם_05-03-2026.mp3",
    summary: "זוג עולים חדשים מארה\"ב. רכישת דירה ב-3.1 מיליון ₪. יש להם הון עצמי גבוה (50%). דיון על מסלול דולרי ומסלול שקלי.",
    daysAgo: 13,
    tasks: [
      { title: "בדיקת מסלולי מט\"ח", description: "דולר vs שקל – ניתוח סיכון", assignee: "Advisor", priority: "High" },
      { title: "תרגום מסמכים לעברית", description: "תלושי שכר אמריקאיים", assignee: "Client", priority: "High" },
      { title: "קבלת אישור עקרוני", description: "הגשה לבנק לאומי + הפועלים", assignee: "Advisor", priority: "High" },
      { title: "פגישה עם עו\"ד לבדיקת חוזה", description: "ייעוץ לפני חתימה", assignee: "Client", priority: "Medium" },
    ],
  },
  {
    filename: "ייעוץ_גולן_01-03-2026.mp3",
    summary: "לקוח עצמאי, הכנסה לא קבועה. רכישת קרקע ובנייה עצמית. פרויקט: 2.2M ₪ בנייה + 800K ₪ קרקע. הסבר על הלוואות ליווי בנייה.",
    daysAgo: 17,
    tasks: [
      { title: "הכנת תוכנית עסקית", description: "עצמאי – להמציא 2 שנות שומות", assignee: "Client", priority: "High" },
      { title: "בדיקת מסלול ליווי בנייה", description: "שחרור שלבי בהתאם לביצוע", assignee: "Advisor", priority: "High" },
      { title: "שמאות קרקע ראשונית", description: "לפני הגשת בקשה", assignee: "Client", priority: "Medium" },
    ],
  },
];

router.post("/", requireAuth, async (req, res) => {
  try {
    const sessions = [];
    const tasks = [];
    const now = Date.now();

    for (const mock of MOCK_SESSIONS) {
      const sessionId = crypto.randomUUID();
      const createdAt = new Date(now - mock.daysAgo * 24 * 60 * 60 * 1000).toISOString();

      sessions.push({
        id:          sessionId,
        createdAt,
        filename:    mock.filename,
        summary:     mock.summary,
        providerId:  req.user.id,
        clientEmail: "demo@client.com",
      });

      for (const t of mock.tasks) {
        tasks.push({
          id:          crypto.randomUUID(),
          sessionId,
          title:       t.title,
          description: t.description,
          assignee:    t.assignee,
          priority:    t.priority,
          completed:   Math.random() > 0.65,
          createdAt,
        });
      }
    }

    await db.replaceSessions(sessions);
    await db.replaceTasks(tasks);

    res.json({ sessions: sessions.length, tasks: tasks.length });
  } catch (err) {
    logger.error({ err: err.message }, "[mock] POST / failed");
    res.status(500).json({ error: err.message });
  }
});

export default router;
