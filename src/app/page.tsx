'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'join' | 'login'>('join')
  const [poolPass, setPoolPass] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const JOIN_PASSWORD = process.env.NEXT_PUBLIC_JOIN_PASSWORD || 'masters2026'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'join') {
      if (poolPass !== JOIN_PASSWORD) {
        setError('Wrong pool password — ask Kirk!')
        setLoading(false)
        return
      }
const { data, error: err } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { display_name: name }
  },
})
console.log('signup result:', data, err)
if (err) {
  setError(err.message)
  setLoading(false)
  return
}
if (data.user) {
  await supabase.from('profiles').insert({
    id: data.user.id,
    display_name: name,
    is_admin: false,
    payment_status: 'pending',
  })
}
router.push('/pick')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push('/leaderboard')
    }
  }

  return (
    <div className="page fade-in" style={{ maxWidth: 520, paddingTop: '3rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>⛳</div>
        <h1 style={{ fontSize: '2.4rem', color: 'var(--green)', marginBottom: '0.4rem' }}>KO Masters Pool</h1>
        <p style={{ color: 'var(--gold)', fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontSize: '1.05rem', marginBottom: '1.25rem' }}>
          Augusta National · April 2026
        </p>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)', margin: '0 2rem 1.5rem' }} />
        <p style={{ color: 'var(--gray)', lineHeight: 1.75, fontSize: '0.95rem' }}>
          Pick <strong>4 golfers</strong> totaling <strong>≤ 50 points</strong>.<br />
          Best 3 of 4 scores win. Worst score dropped.<br />
          <strong>$20/entry</strong> · Up to <strong>3 entries</strong>.
        </p>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: '1.5rem' }}>
        {(['join', 'login'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError('') }} style={{
            flex: 1, padding: '0.7rem',
            background: mode === m ? 'var(--green)' : 'var(--white)',
            color: mode === m ? '#fff' : 'var(--gray)',
            border: 'none', cursor: 'pointer',
            fontSize: '0.92rem', fontWeight: mode === m ? 600 : 400,
            transition: 'all 0.15s',
          }}>
            {m === 'join' ? '🎟️  Join Pool' : '🔑  Sign In'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {mode === 'join' && (
            <>
              <div>
                <label style={labelStyle}>Pool Password</label>
                <input className="input" placeholder="Ask Kirk for the code" value={poolPass} onChange={e => setPoolPass(e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Your Name</label>
                <input className="input" placeholder="e.g. Kirk Oliver" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input className="input" type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input className="input" type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error">⚠ {error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.25rem', width: '100%', padding: '0.8rem' }}>
            {loading ? 'Loading…' : mode === 'join' ? 'Create Account & Pick Team →' : 'Sign In →'}
          </button>
        </form>
      </div>

      {/* Rules */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ color: 'var(--green)', marginBottom: '0.75rem', fontSize: '1rem' }}>📋 Quick Rules</h3>
        <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2, fontSize: '0.9rem' }}>
          <li>Pick <strong>4 golfers</strong> · combined points <strong>≤ 50</strong></li>
          <li>Best <strong>3 of 4</strong> scores count — worst is dropped</li>
          <li>Need <strong>≥ 3 players to make the cut</strong> or you're DQ'd</li>
          <li>Lowest team score wins · Tiebreaker: had the winner?</li>
          <li>Entries lock <strong>Thursday 5am PT</strong> · No exceptions</li>
          <li>Pay <strong>$20/entry</strong> · Venmo @KirkOliver or PayPal kirko005@gmail.com</li>
        </ol>
      </div>

    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--gray)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em',
}
