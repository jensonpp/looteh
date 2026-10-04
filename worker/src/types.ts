export type Env = {
  DB: D1Database
  ASSETS: Fetcher
  JWT_SECRET: string
  RESEND_API_KEY: string
  APP_ENV: string
}

export type SessionUser = {
  userId: string
  email: string
}

export type Variables = {
  user: SessionUser | null
}
