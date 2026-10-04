import type { Env } from '../types'

// Thin wrapper around Resend's HTTP API — no SMTP needed in Workers.
export async function sendStreakReminderEmail(
  env: Env,
  to: string,
  unsubscribeUrl: string,
): Promise<void> {
  if (!env.RESEND_API_KEY || env.RESEND_API_KEY.startsWith('re_placeholder')) {
    console.log(`[email:dev-noop] would send streak reminder to ${to}`)
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'FinLit <streaks@finlit.app>',
      to,
      subject: "Don't lose your streak! 🔥",
      html: `<p>You're one lesson away from keeping your streak alive today.</p>
             <p><a href="${unsubscribeUrl}">Unsubscribe from reminders</a></p>`,
    }),
  })
}
