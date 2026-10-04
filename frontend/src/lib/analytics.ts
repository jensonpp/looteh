import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com'

let initialized = false

/** Call once at app startup. No-ops (with a console note) if no PostHog key is configured yet. */
export function initAnalytics(): void {
  if (initialized) return
  if (!POSTHOG_KEY) {
    console.info('[analytics] VITE_POSTHOG_KEY not set — analytics disabled locally.')
    return
  }
  posthog.init(POSTHOG_KEY, { api_host: POSTHOG_HOST, capture_pageview: true })
  initialized = true
}

export type AnalyticsEvent =
  | 'signup'
  | 'login'
  | 'lesson_started'
  | 'question_answered'
  | 'lesson_completed'
  | 'lesson_abandoned'
  | 'streak_broken'

export function track(event: AnalyticsEvent, properties?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.capture(event, properties)
}

export function identify(userId: string, properties?: Record<string, unknown>): void {
  if (!initialized) return
  posthog.identify(userId, properties)
}
