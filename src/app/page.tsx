'use client'
import { useState, useEffect } from 'react'
import { supabase, formatScore } from '../lib/supabase'
import { useRouter } from 'next/navigation'

type Golfer = { name: string; current_score: number; position: string | null; made_cut: boolean | null }
type LeaderboardRow = {
  entry_id: string; entry_name: string; place: number; team_score: number
  is_disqualified: boolean; total_points_used: number
  golfer_1: string; score_1: number
  golfer_2: string; score_2: number
  golfer_3: string; score_3: number
  golfer_4: string; score_4: number
}

export default function HomePage() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([])
  const [totalEntries, setTotalEntries] = useState(0)
  const [showLeader, setShowLeader] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  // Join/login form state
  const [mode, setMode] = useState<'join' | 'login'>('join')
  const [poolLocked, setPoolLocked] = useState(false)
  const [poolPass, setPoolPass] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const JOIN_PASSWORD = process.env.NEXT_PUBLIC_JOIN_PASSWORD || 'masters2026'

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAuthed(true)
        const [{ data: profile }, { data: gs }, { data: lb }, { count }, { data: settings }] = await Promise.all([
          supabase.from('profiles').select('display_name,payment_status').eq('id', user.id).single(),
          supabase.from('golfers').select('name,current_score,position,made_cut').order('current_score', { ascending: true }).limit(10),
          supabase.from('entry_leaderboard').select('*').order('place'),
          supabase.from('entries').select('*', { count: 'exact', head: true }),
          supabase.from('pool_settings').select('value').eq('key', 'show_leader').single(),
        ])
        if (profile) { setDisplayName(profile.display_name); setPaymentStatus(profile.payment_status ?? 'pending') }
        if (gs) setGolfers(gs)
        if (lb) setLeaderboard(lb)
        if (count) setTotalEntries(count)
        if (settings) setShowLeader(!!settings.value)
        const stored = localStorage.getItem('masters_favorites')
        if (stored) setFavorites(JSON.parse(stored))
      } else {
        setAuthed(false)
        const { data: locked } = await supabase.from('entries').select('id').eq('is_locked', true).limit(1)
        if (locked && locked.length > 0) { setPoolLocked(true); setMode('login') }
      }
    }
    init()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'join') {
      if (poolPass !== JOIN_PASSWORD) {
        setError('Wrong pool password.')
        setLoading(false)
        return
      }
      const { data, error: err } = await supabase.auth.signUp({
        email, password, options: { data: { display_name: name } },
      })
      if (err) { setError(err.message); setLoading(false); return }
      if (data.user) {
        const { error: profileErr } = await supabase.from('profiles').upsert({
          id: data.user.id, display_name: name, payment_status: 'pending',
        }, { onConflict: 'id' })
        if (profileErr) { setError('Account created but profile setup failed: ' + profileErr.message); setLoading(false); return }
      } else {
        setError('Signup failed — no user returned. Try signing in instead.'); setLoading(false); return
      }
      router.push('/pick')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      router.push('/')
      window.location.reload()
    }
  }

  // Loading state
  if (authed === null) {
    return <div className="page" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--gray)' }}>Loading…</div>
  }

  // ─── LOGGED-IN DASHBOARD ───────────────────────────────────────────
  if (authed) {
    const purse = totalEntries * 20
    const first = Math.round(purse * 0.70)
    const second = Math.round(purse * 0.20)
    const third = Math.round(purse * 0.10)

    const leaderLabel = (place: number) => {
      const entries = leaderboard.filter(r => r.place === place && !r.is_disqualified)
      if (entries.length === 0) return '—'
      if (entries.length === 1) return entries[0].entry_name
      if (entries.length === 2) return 'Two-way tie'
      return `${entries.length}-way tie`
    }

    return (
      <div className="page fade-in" style={{ paddingTop: '2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ color: 'var(--green)', marginBottom: '0.2rem' }}>⛳ Masters Pool 2026</h1>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>Welcome back, {displayName}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a href="/pick" className="btn btn-ghost" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>My Picks</a>
            <a href="/leaderboard" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>Full Leaderboard</a>
          </div>
        </div>

        {/* Purse */}
        <div className="card" style={{ marginBottom: '1.5rem', background: 'var(--green)', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Total Purse</div>
              <div style={{ color: 'var(--gold)', fontFamily: 'Playfair Display, serif', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1 }}>${purse.toLocaleString()}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginTop: 4 }}>{totalEntries} entries × $20</div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                { place: '1st', placeNum: 1, pct: '70%', amt: first, color: 'var(--gold)' },
                { place: '2nd', placeNum: 2, pct: '20%', amt: second, color: '#C0C0C0' },
                { place: '3rd', placeNum: 3, pct: '10%', amt: third, color: '#CD7F32' },
              ].map(p => (
                <div key={p.place} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.75rem 1.1rem', minWidth: 110 }}>
                  <div style={{ color: p.color, fontWeight: 700, fontSize: '1.1rem', fontFamily: 'Playfair Display, serif' }}>{p.place}</div>
                  {showLeader && (
                    <div style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600, marginBottom: 3, opacity: 0.9 }}>
                      {leaderLabel(p.placeNum)}
                    </div>
                  )}
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.25rem' }}>${p.amt.toLocaleString()}</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.73rem' }}>{p.pct}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Unpaid warning */}
        {paymentStatus !== 'paid' && (
          <div style={{
            marginBottom: '1.5rem', padding: '1rem 1.25rem',
            background: '#fff3cd', border: '2px solid #e6a817', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#7a4f00', fontSize: '0.97rem' }}>
                You are currently marked as unpaid.
              </div>
              <div style={{ color: '#7a4f00', fontSize: '0.88rem', marginTop: '0.2rem' }}>
                Please send $20 per entry · <strong>Venmo @KirkOliver</strong> or <strong>PayPal kirko005@gmail.com</strong>
              </div>
            </div>
          </div>
        )}

        {/* Favorite Entries */}
        {favorites.length > 0 && leaderboard.some(r => favorites.includes(r.entry_id)) && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.25rem', border: '2px solid var(--gold)' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1rem' }}>★</span>
              <h3 style={{ fontSize: '0.9rem', color: '#fff', margin: 0 }}>Favorite Entries</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)' }}>
                  <th style={th}>Pos</th>
                  <th style={{ ...th, textAlign: 'left' }}>Entry</th>
                  <th style={th}>Score</th>
                  <th style={{ ...th, textAlign: 'left', fontSize: '0.75rem' }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.filter(r => favorites.includes(r.entry_id)).map((row, i) => (
                  <tr key={row.entry_id} style={{ background: row.is_disqualified ? '#fff8f8' : i % 2 === 0 ? '#fffdf4' : '#fff9e6' }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%', fontSize: '0.78rem', fontWeight: 700,
                        background: row.is_disqualified ? '#fdeaea' : row.place === 1 ? 'var(--gold)' : row.place === 2 ? '#C0C0C0' : row.place === 3 ? '#CD7F32' : 'var(--cream-dark)',
                        color: row.is_disqualified ? 'var(--red)' : row.place <= 3 ? '#fff' : 'var(--gray)',
                      }}>
                        {row.is_disqualified ? 'DQ' : row.place}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: row.place === 1 ? 700 : 400 }}>{row.entry_name}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: (row.team_score ?? 0) < 0 ? 'var(--red)' : (row.team_score ?? 0) === 0 ? 'var(--dark)' : '#3a6ea5' }}>
                      {formatScore(row.team_score)}
                    </td>
                    <td style={{ ...td, fontSize: '0.75rem', color: 'var(--gray)' }}>
                      {[row.golfer_1, row.golfer_2, row.golfer_3, row.golfer_4].map(n => n?.split(' ').pop()).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Two-column: Golfers + Leaderboard */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem', alignItems: 'start' }}>

          {/* Top 10 Golfers */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--cream-dark)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--green)', margin: 0 }}>🏌️ Top 10 Golfers</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)' }}>
                  <th style={th}>Pos</th>
                  <th style={{ ...th, textAlign: 'left' }}>Player</th>
                  <th style={th}>Score</th>
                  <th style={th}>Cut</th>
                </tr>
              </thead>
              <tbody>
                {golfers.map((g, i) => (
                  <tr key={g.name} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ ...td, textAlign: 'center', color: 'var(--gray)', fontSize: '0.8rem' }}>{g.position ?? i + 1}</td>
                    <td style={{ ...td }}>{g.name.split(' ').slice(-1)[0]}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: (g.current_score ?? 0) < 0 ? 'var(--red)' : (g.current_score ?? 0) === 0 ? 'var(--dark)' : '#3a6ea5' }}>
                      {formatScore(g.current_score)}
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: '0.75rem' }}>
                      {g.made_cut === true ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓</span>
                        : g.made_cut === false ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>✗</span>
                        : <span style={{ color: 'var(--gray)' }}>—</span>}
                    </td>
                  </tr>
                ))}
                {golfers.length === 0 && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--gray)', padding: '1.5rem' }}>Tournament not yet started</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Top 25 Entries */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--cream-dark)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--green)', margin: 0 }}>🏆 Top 25 Entries</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' }}>
              <thead>
                <tr style={{ background: 'var(--cream)' }}>
                  <th style={th}>Pos</th>
                  <th style={{ ...th, textAlign: 'left' }}>Entry</th>
                  <th style={th}>Score</th>
                  <th style={{ ...th, textAlign: 'left', fontSize: '0.75rem' }}>Team</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.entry_id} style={{ background: row.is_disqualified ? '#fff8f8' : i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%', fontSize: '0.78rem', fontWeight: 700,
                        background: row.is_disqualified ? '#fdeaea'
                          : row.place === 1 ? 'var(--gold)'
                          : row.place === 2 ? '#C0C0C0'
                          : row.place === 3 ? '#CD7F32'
                          : 'var(--cream-dark)',
                        color: row.is_disqualified ? 'var(--red)' : row.place <= 3 ? '#fff' : 'var(--gray)',
                      }}>
                        {row.is_disqualified ? 'DQ' : row.place}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: row.place === 1 ? 700 : 400 }}>{row.entry_name}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: (row.team_score ?? 0) < 0 ? 'var(--red)' : (row.team_score ?? 0) === 0 ? 'var(--dark)' : '#3a6ea5' }}>
                      {formatScore(row.team_score)}
                    </td>
                    <td style={{ ...td, fontSize: '0.75rem', color: 'var(--gray)' }}>
                      {[row.golfer_1, row.golfer_2, row.golfer_3, row.golfer_4].map(n => n?.split(' ').pop()).join(', ')}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--gray)', padding: '1.5rem' }}>No entries yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // ─── LOGGED-OUT / JOIN PAGE ────────────────────────────────────────
  return (
    <div className="page fade-in" style={{ maxWidth: 520, paddingTop: '3rem' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>⛳</div>
        <h1 style={{ fontSize: '2.4rem', color: 'var(--green)', marginBottom: '0.4rem' }}>Masters Pool</h1>
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

      {/* Tab toggle — hide Join if pool is locked */}
      {!poolLocked && (
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
      )}
      {poolLocked && (
        <div style={{ marginBottom: '1.5rem', padding: '0.65rem 1rem', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 6, textAlign: 'center', color: 'var(--gray)', fontSize: '0.88rem' }}>
          🔒 The pool is locked — sign in to view the leaderboard.
        </div>
      )}

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {mode === 'join' && (
            <>
              <div>
                <label style={labelStyle}>Pool Password</label>
                <input className="input" placeholder="Ask for the code" value={poolPass} onChange={e => setPoolPass(e.target.value)} required />
              </div>
              <div>
                <label style={labelStyle}>Your Name</label>
                <input className="input" placeholder="e.g. John Smith" value={name} onChange={e => setName(e.target.value)} required />
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
          <li>Pay <strong>$20/entry</strong> · payment info in the footer after sign-up</li>
        </ol>
      </div>

    </div>
  )
}

const th: React.CSSProperties = { padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.75rem', textAlign: 'center', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '1px solid var(--border)' }
const td: React.CSSProperties = { padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--border)' }
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.82rem', fontWeight: 600,
  color: 'var(--gray)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em',
}
