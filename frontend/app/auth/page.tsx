'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Mail, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [info, setInfo]         = useState<string | null>(null)
  const [busy, setBusy]         = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setInfo(null)
  }

  async function handleSubmit() {
    setError(null)
    setInfo(null)
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return }
    if (mode === 'signup' && password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setBusy(true)

    if (mode === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (e) { setError(e.message); setBusy(false); return }
      router.back()
    } else {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password })
      if (e) { setError(e.message); setBusy(false); return }
      setInfo('Check your email for a confirmation link, then log in.')
      setMode('login')
    }

    setBusy(false)
  }

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: '100dvh' }}>
      <div className="h-11 flex-shrink-0" />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-4 border-b" style={{ borderColor: '#F0F0F0' }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          <ArrowLeft size={18} style={{ color: '#1A1A1A' }} />
        </button>
        <h2 className="text-base font-bold" style={{ color: '#1A1A1A' }}>
          {mode === 'login' ? 'Log In' : 'Create Account'}
        </h2>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 gap-5">

        {/* Mode toggle */}
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: '#F5F5F5' }}
        >
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#1A1A1A' : '#888',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Info / error banners */}
        {info && (
          <div className="px-4 py-3 rounded-2xl text-sm" style={{ backgroundColor: '#E8F4EC', color: '#3BB273' }}>
            {info}
          </div>
        )}
        {error && (
          <div className="px-4 py-3 rounded-2xl text-sm" style={{ backgroundColor: '#FDF2F2', color: '#D4183D' }}>
            {error}
          </div>
        )}

        {/* Email */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#888' }}>EMAIL</label>
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <Mail size={17} style={{ color: '#BBBBBB', flexShrink: 0 }} />
            <input
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#1A1A1A' }}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#888' }}>PASSWORD</label>
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ backgroundColor: '#F5F5F5' }}
          >
            <Lock size={17} style={{ color: '#BBBBBB', flexShrink: 0 }} />
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: '#1A1A1A' }}
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            <button onClick={() => setShowPw(v => !v)} className="flex-shrink-0">
              {showPw
                ? <EyeOff size={16} style={{ color: '#BBBBBB' }} />
                : <Eye    size={16} style={{ color: '#BBBBBB' }} />}
            </button>
          </div>
        </div>

        {/* Confirm password (sign-up only) */}
        {mode === 'signup' && (
          <div>
            <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#888' }}>CONFIRM PASSWORD</label>
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <Lock size={17} style={{ color: '#BBBBBB', flexShrink: 0 }} />
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: '#1A1A1A' }}
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full py-4 rounded-full font-bold text-sm text-white transition-all active:scale-95 mt-1"
          style={{ backgroundColor: busy ? '#BBBBBB' : '#2D7DD2' }}
        >
          {busy ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>

        <p className="text-center text-xs" style={{ color: '#BBBBBB' }}>
          Your account is optional — SmartScan works fully without one.
        </p>
      </div>
    </div>
  )
}
