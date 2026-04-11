import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Zap, Eye, EyeOff, Mail, Lock, User, Loader2, CheckCircle2 } from 'lucide-react'
import api, { setToken } from '../services/api'
import { setUser } from '../store/userSlice'
import AuthPageLayout from './AuthPageLayout'

const inputIconClass =
  'pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-lime-400/90'

const cardClass =
  'relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900/70 p-8 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl sm:p-10'

const SignupForm = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const userData = { name, email, password }
    setSubmitting(true)
    try {
      const response = await api.post('api/signup', userData)
      const data = response?.data?.data ?? response?.data ?? {}
      const token = data.accessToken ?? response?.data?.accessToken
      if (token) setToken(token)
      const rawUser = data.user ?? data
      if (rawUser && typeof rawUser === 'object' && token) {
        const displayName =
          rawUser.name ?? ([rawUser.firstName, rawUser.lastName].filter(Boolean).join(' ') || rawUser.email)
        dispatch(setUser({ name: displayName, email: rawUser.email ?? email, id: rawUser._id ?? rawUser.id, ...rawUser }))
        navigate('/home')
        return
      }
      setSuccess(true)
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        (err?.message === 'Network Error' ? 'Network error. Check your connection.' : 'Could not create account. Try again.')
      setError(typeof msg === 'string' ? msg : 'Could not create account. Try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthPageLayout>
      {success ? (
        <div className={cardClass}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/40 to-transparent"
            aria-hidden
          />
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lime-500/15 ring-1 ring-lime-400/30">
              <CheckCircle2 className="h-9 w-9 text-lime-400" strokeWidth={2} aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-[1.65rem]">You&apos;re all set</h1>
            <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-zinc-400">
              Your account was created. Sign in to start shopping.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-lime-400 via-lime-400 to-sky-500 py-3.5 text-[15px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_-8px_rgba(163,230,53,0.45)] transition hover:shadow-[0_16px_48px_-8px_rgba(163,230,53,0.55)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className={cardClass}>
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/40 to-transparent"
              aria-hidden
            />

            <div className="mb-8 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-lime-400/25 blur-xl" aria-hidden />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 via-lime-400 to-sky-500 shadow-[0_8px_32px_-4px_rgba(163,230,53,0.45)] ring-1 ring-white/20">
                  <Zap className="h-8 w-8 text-white drop-shadow-sm" strokeWidth={2.25} />
                </div>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-[1.65rem] font-bold tracking-tight text-white sm:text-3xl">Create your account</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
                Join us to browse products and checkout faster.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3 text-sm text-red-200/95"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-zinc-300">
                  Name
                </label>
                <div className="group relative">
                  <User className={inputIconClass} aria-hidden />
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/50 py-3.5 pl-11 pr-4 text-[15px] text-white shadow-inner placeholder:text-zinc-500 outline-none transition-all focus:border-lime-500/40 focus:bg-zinc-800/80 focus:ring-2 focus:ring-lime-400/25"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <div className="group relative">
                  <Mail className={inputIconClass} aria-hidden />
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/50 py-3.5 pl-11 pr-4 text-[15px] text-white shadow-inner placeholder:text-zinc-500 outline-none transition-all focus:border-lime-500/40 focus:bg-zinc-800/80 focus:ring-2 focus:ring-lime-400/25"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  Password
                </label>
                <div className="group relative">
                  <Lock className={inputIconClass} aria-hidden />
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-800/50 py-3.5 pl-11 pr-12 text-[15px] text-white shadow-inner placeholder:text-zinc-500 outline-none transition-all focus:border-lime-500/40 focus:bg-zinc-800/80 focus:ring-2 focus:ring-lime-400/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-lime-400 via-lime-400 to-sky-500 py-3.5 text-[15px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_-8px_rgba(163,230,53,0.45)] transition hover:shadow-[0_16px_48px_-8px_rgba(163,230,53,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                <span className="relative inline-flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      Creating account…
                    </>
                  ) : (
                    'Sign up'
                  )}
                </span>
              </button>
            </form>

            <p className="mt-8 border-t border-white/[0.06] pt-8 text-center text-sm text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-lime-400/95 transition-colors hover:text-lime-300">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-600">
            By signing up you agree to our terms and privacy policy
          </p>
        </>
      )}
    </AuthPageLayout>
  )
}

export default SignupForm
