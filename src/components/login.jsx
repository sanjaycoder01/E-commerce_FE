import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Zap, Eye, EyeOff } from 'lucide-react'
import api, { setToken } from '../services/api'
import { setUser } from '../store/userSlice'

const LoginForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const userData = { email, password }
    try {
      const response = await api.post('/login', userData)
      const data = response?.data?.data ?? response?.data ?? {}
      const token = data.accessToken ?? response?.data?.accessToken
      if (token) setToken(token)
      const rawUser = data.user ?? data
      if (rawUser && typeof rawUser === 'object') {
        const name = rawUser.name ?? ([rawUser.firstName, rawUser.lastName].filter(Boolean).join(' ') || rawUser.email)
        dispatch(setUser({ name, email: rawUser.email ?? email, id: rawUser._id ?? rawUser.id, ...rawUser }))
      }
      navigate('/home')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-zinc-900/95 p-8 shadow-2xl backdrop-blur-sm">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 to-sky-500 shadow-[0_0_20px_rgba(163,230,53,0.3)]">
            <Zap className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold tracking-tight text-white">
          Sign In
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-400">
          Access your account
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 px-4 py-3 text-white placeholder-zinc-500 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-300"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800/80 py-3 pl-4 pr-11 text-white placeholder-zinc-500 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Keep signed in + Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-lime-500 focus:ring-lime-500/50 focus:ring-offset-0"
              />
              <span className="text-sm text-zinc-400">Keep me signed in</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-zinc-400 hover:text-lime-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-lime-400 to-sky-500 py-3.5 font-semibold uppercase tracking-wider text-white shadow-lg transition hover:opacity-95 hover:shadow-lime-500/20 focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            Sign In
          </button>
        </form>

        {/* Create account */}
        <p className="mt-6 text-center text-sm text-zinc-400">
          New here?{' '}
          <Link
            to="/signup"
            className="font-medium text-lime-400 hover:text-lime-300 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginForm
