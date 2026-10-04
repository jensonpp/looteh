import type { Env } from '../types'
import { sendStreakReminderEmail } from '../lib/email'
import { todayUtc } from '../lib/db'

function addDaysUtc(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Daily job: email users whose streak is still alive but at risk (active yesterday,
 * not yet active today) and who haven't opted out of reminders.
 */
export async function runStreakReminderJob(env: Env): Promise<void> {
  const today = todayUtc()
  const yesterday = addDaysUtc(today, -1)

  const { results } = await env.DB.prepare(
    `SELECT u.id as user_id, u.email as email
     FROM user_stats s
     JOIN users u ON u.id = s.user_id
     WHERE s.last_active_date = ?
       AND s.email_reminders_enabled = 1`,
  )
    .bind(yesterday)
    .all<{ user_id: string; email: string }>()

  for (const row of results) {
    const unsubscribeUrl = `https://finlit.app/profile?unsubscribe=1&uid=${row.user_id}`
    await sendStreakReminderEmail(env, row.email, unsubscribeUrl)
  }
}
