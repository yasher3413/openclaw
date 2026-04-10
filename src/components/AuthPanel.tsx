import { useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export const AuthPanel = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!supabase || !isSupabaseConfigured) {
      setMessage('Add Supabase env vars to continue.')
      return
    }
    setLoading(true)
    setMessage('')
    const action =
      mode === 'login'
        ? supabase.auth.signInWithPassword
        : supabase.auth.signUp
    const { error } = await action({ email, password })
    if (error) {
      setMessage(error.message)
    } else if (mode === 'signup') {
      setMessage('Account created. Check your email if confirmation is on.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-night-700 bg-night-900/80 p-8 shadow-soft">
        <p className="text-xs uppercase tracking-[0.3em] text-night-400">
          OpenClaw
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          {mode === 'login' ? 'Welcome back' : 'Create your access'}
        </h2>
        <p className="mt-1 text-sm text-night-300">
          Single-user control for Yash Gandhi.
        </p>
        <div className="mt-6 space-y-3">
          <input
            className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2 text-sm text-white focus:border-accent-400 focus:outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="w-full rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-night-950 transition hover:bg-accent-400 disabled:opacity-60"
            onClick={submit}
            disabled={loading}
          >
            {loading ? 'Working...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
          {message ? (
            <p className="text-xs text-accent-300">{message}</p>
          ) : null}
        </div>
        <button
          className="mt-4 text-xs text-night-400"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        >
          {mode === 'login'
            ? 'Need an account? Sign up.'
            : 'Already set? Log in.'}
        </button>
      </div>
    </div>
  )
}
