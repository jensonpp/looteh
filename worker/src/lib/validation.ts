import type { Context } from 'hono'
import { z } from 'zod'
import type { Env, Variables } from '../types'

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Password is required.'),
})

export const answerSchema = z.object({
  optionId: z.string().min(1),
})

export const lessonCompleteSchema = z.object({
  correctCount: z.number().int().min(0).default(0),
  totalQuestions: z.number().int().min(0).default(0),
})

export const preferencesSchema = z.object({
  emailRemindersEnabled: z.boolean(),
})

/**
 * Parses and validates a JSON request body against a zod schema.
 * Returns a discriminated result: on failure the caller should return
 * `result.response` (a 400 with the first issue's message); on success
 * use `result.data`.
 */
export async function parseJsonBody<S extends z.ZodTypeAny>(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  schema: S,
): Promise<{ success: true; data: z.infer<S> } | { success: false; response: Response }> {
  const raw = await c.req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue.path.join('.')
    return {
      success: false,
      response: c.json(
        { error: 'invalid_input', message: field ? `${field}: ${issue.message}` : issue.message },
        400,
      ),
    }
  }
  return { success: true, data: parsed.data }
}