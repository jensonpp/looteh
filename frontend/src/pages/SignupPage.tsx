import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import { useAppStore } from '../store/useAppStore'
import { identify, track } from '../lib/analytics'

export default function SignupPage() {
  const navigate = useNavigate()
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { user } = await api.signup(email, password)
      setUser(user)
      identify(user.id, { email: user.email })
      track('signup')
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? (err.message ?? 'Signup failed') : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col justify-center px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-dim">Start learning money, the fun way.</p>
      <form className="glass mt-8 flex flex-col gap-4 p-6" onSubmit={handleSubmit}>
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark px-3 py-2.5"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-dark px-3 py-2.5"
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-3 py-2.5 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-4 text-sm text-dim">
        Already have an account?{' '}
        <Link to="/login" className="text-cyan-300 underline hover:text-cyan-200">
          Log in
        </Link>
      </p>
    </div>
  )
}
