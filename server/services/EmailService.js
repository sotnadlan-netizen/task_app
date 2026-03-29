import { Resend } from 'resend';
import logger from '../utils/logger.js';

const FROM = process.env.EMAIL_FROM || 'noreply@advisorai.app';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

/**
 * Send a notification email to the client when a new session with tasks is created.
 * Fire-and-forget — caller should not await.
 *
 * @param {string} clientEmail
 * @param {string} sessionTitle
 * @param {number} taskCount
 */
export async function sendNewSessionEmail(clientEmail, sessionTitle, taskCount) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping sendNewSessionEmail');
    return;
  }
  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `נוספו משימות חדשות עבורך — ${sessionTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>שלום,</h2>
          <p>נוצרה פגישה חדשה עבורך: <strong>${sessionTitle}</strong></p>
          <p>יש לך <strong>${taskCount}</strong> משימות חדשות לביצוע.</p>
          <p>אנא היכנס למערכת כדי לצפות במשימות שלך ולעדכן את הסטטוס שלהן.</p>
          <br/>
          <p>בברכה,<br/>צוות AdvisorAI</p>
        </div>
      `,
    });
    logger.info({ clientEmail }, '[email] sendNewSessionEmail sent');
  } catch (err) {
    logger.error({ err: err.message }, '[email] sendNewSessionEmail failed');
  }
}

/**
 * Send a reminder email to the client about incomplete tasks.
 * Fire-and-forget — caller should not await.
 *
 * @param {string} clientEmail
 * @param {string} sessionTitle
 * @param {number} pendingCount
 */
export async function sendReminderEmail(clientEmail, sessionTitle, pendingCount) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping sendReminderEmail');
    return;
  }
  try {
    await getResend().emails.send({
      from: FROM,
      to: clientEmail,
      subject: `תזכורת: יש לך משימות פתוחות — ${sessionTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>תזכורת ידידותית</h2>
          <p>נותרו לך <strong>${pendingCount}</strong> משימות פתוחות בפגישה: <strong>${sessionTitle}</strong></p>
          <p>המשימות ממתינות לטיפולך כבר מספר ימים. אנא היכנס למערכת ועדכן את הסטטוס שלהן.</p>
          <br/>
          <p>בברכה,<br/>צוות AdvisorAI</p>
        </div>
      `,
    });
    logger.info({ clientEmail }, '[email] sendReminderEmail sent');
  } catch (err) {
    logger.error({ err: err.message }, '[email] sendReminderEmail failed');
  }
}

/**
 * Send a confirmation email to the provider when all client tasks are complete.
 * Fire-and-forget — caller should not await.
 *
 * @param {string} providerEmail
 * @param {string} clientEmail
 * @param {string} sessionTitle
 */
export async function sendAllTasksCompleteEmail(providerEmail, clientEmail, sessionTitle) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn('[email] RESEND_API_KEY not set — skipping sendAllTasksCompleteEmail');
    return;
  }
  try {
    await getResend().emails.send({
      from: FROM,
      to: providerEmail,
      subject: `הלקוח השלים את כל המשימות — ${sessionTitle}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2>כל המשימות הושלמו!</h2>
          <p>הלקוח <strong>${clientEmail}</strong> השלים את כל המשימות שהוקצו לו בפגישה: <strong>${sessionTitle}</strong></p>
          <p>תוכל להיכנס למערכת ולעבור לשלב הבא.</p>
          <br/>
          <p>בברכה,<br/>צוות AdvisorAI</p>
        </div>
      `,
    });
    logger.info({ providerEmail }, '[email] sendAllTasksCompleteEmail sent');
  } catch (err) {
    logger.error({ err: err.message }, '[email] sendAllTasksCompleteEmail failed');
  }
}
