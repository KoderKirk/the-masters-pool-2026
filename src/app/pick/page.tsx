'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const MAX_PTS = 50

type Golfer = { id: string; name: string; points: number; current_score: number }

export default function PickPage() {
  const router = useRouter()
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [selected, setSelected] = useState<Golfer[]>([])
  const [search, setSearch] = useState('')
  const [entryName, setEntryName] = useState('')
  const [entryNum, setEntryNum] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [poolLocked, setPoolLocked] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      let { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (!profile) {
        // Profile missing (e.g. signup interrupted) — create it now
        const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player'
        await supabase.from('profiles').upsert({ id: user.id, display_name: displayName, is_admin: false, payment_status: 'pending' }, { onConflict: 'id' })
        profile = { display_name: displayName }
      }
      setEntryName(`${profile.display_name} #1`)

      const [{ data: golferData }, { data: anyLocked }] = await Promise.all([
        supabase.from('golfers').select('id,name,points,current_score').order('points', { ascending: false }),
        supabase.from('entries').select('id').eq('is_locked', true).limit(1),
      ])
      if (golferData) setGolfers(golferData)
      if (anyLocked && anyLocked.length > 0) setPoolLocked(true)
      setLoading(false)
    }
    init()
  }, [router])

  const totalPts = selected.reduce((s, g) => s + g.points, 0)
  const pct = Math.min((totalPts / MAX_PTS) * 100, 100)
  const overBudget = totalPts > MAX_PTS

  function toggle(g: Golfer) {
    if (selected.find(s => s.id === g.id)) {
      setSelected(selected.filter(s => s.id !== g.id))
      setError('')
      return
    }
    if (selected.length >= 4) { setError('You can only pick 4 golfers.'); return }
    if (totalPts + g.points > MAX_PTS) { setError(`${g.name} would push you over 50 points.`); return }
    setError('')
    setSelected([...selected, g])
  }

  async function save() {
    if (poolLocked) { setError("Sorry, you missed the cut! ✂️ Entries are locked — the tournament has already started."); return }
    if (selected.length !== 4) { setError('Select exactly 4 golfers.'); return }
    if (overBudget) { setError('You are over the 50 point budget.'); return }
    if (!entryName.trim()) { setError('Give your entry a name.'); return }
    setSaving(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('entries').upsert({
      user_id: userId,
      entry_number: entryNum,
      entry_name: entryName.trim(),
      golfer_1_id: selected[0].id,
      golfer_2_id: selected[1].id,
      golfer_3_id: selected[2].id,
      golfer_4_id: selected[3].id,
      total_points_used: totalPts,
    }, { onConflict: 'user_id,entry_number' })
    setSaving(false)
    if (err) { setError(err.message); return }
    setSuccess('Entry saved! 🎉  Remember to pay $20 via Venmo @KirkOliver')
  }

  const filtered = golfers.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--gray)' }}>Loading roster…</div>

  if (poolLocked) return (
    <div className="page fade-in" style={{ paddingTop: '4rem', maxWidth: 520, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✂️</div>
      <h1 style={{ color: 'var(--red)', marginBottom: '0.75rem' }}>You Missed the Cut</h1>
      <p style={{ color: 'var(--gray)', fontSize: '1rem', lineHeight: 1.75, marginBottom: '1.5rem' }}>
        Entries are locked — the Masters has started and your window to pick has closed.<br />
        <strong>No changes or new entries are allowed.</strong>
      </p>
      <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>
        Head to the <a href="/leaderboard">Leaderboard</a> to see how your team is doing. 🏌️
      </p>
    </div>
  )

  return (
    <div className="page fade-in" style={{ paddingTop: '2rem' }}>
      <h1 style={{ color: 'var(--green)', marginBottom: '0.25rem' }}>Build Your Foursome</h1>
      <p style={{ color: 'var(--gray)', marginBottom: '1.75rem', fontSize: '0.92rem' }}>
        Select 4 golfers · Total ≤ 50 points · Deadline Thursday 5am PT
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Golfer list */}
        <div>
          <input
            className="input"
            placeholder="🔍  Search golfers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          />
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--green)', color: '#fff' }}>
                  <th style={th}>Player</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pts</th>
                  <th style={{ ...th, textAlign: 'center' }}>Score</th>
                  <th style={{ ...th, textAlign: 'center' }}>Pick</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((g, i) => {
                  const isSelected = !!selected.find(s => s.id === g.id)
                  const wouldExceed = !isSelected && totalPts + g.points > MAX_PTS
                  const score = g.current_score
                  return (
                    <tr key={g.id} style={{
                      background: isSelected ? '#edf7f2' : i % 2 === 0 ? '#fff' : '#fafaf8',
                      opacity: wouldExceed ? 0.38 : 1,
                      transition: 'background 0.1s',
                    }}>
                      <td style={td}>{g.name}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>{g.points}</td>
                      <td style={{ ...td, textAlign: 'center', fontWeight: 600, color: score < 0 ? '#B94040' : score === 0 ? 'var(--dark)' : '#3a6ea5' }}>
                        {score === 0 ? 'E' : score > 0 ? `+${score}` : score}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button
                          onClick={() => toggle(g)}
                          disabled={wouldExceed && !isSelected}
                          style={{
                            padding: '3px 12px', borderRadius: 4, border: 'none', cursor: 'pointer',
                            background: isSelected ? 'var(--red)' : 'var(--green)',
                            color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                          }}
                        >
                          {isSelected ? '✕' : '+'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team sidebar */}
        <div className="card" style={{ position: 'sticky', top: '1rem', border: `2px solid ${overBudget ? 'var(--red)' : 'var(--green)'}` }}>
          <h2 style={{ fontSize: '1.15rem', color: 'var(--green)', marginBottom: '1rem' }}>Your Team</h2>

          {/* Budget bar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--gray)', marginBottom: 5 }}>
              <span>Points used</span>
              <span style={{ fontWeight: 700, color: overBudget ? 'var(--red)' : 'var(--green)' }}>{totalPts} / {MAX_PTS}</span>
            </div>
            <div style={{ background: 'var(--cream-dark)', height: 8, borderRadius: 4 }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: overBudget ? 'var(--red)' : 'var(--green)',
                width: `${pct}%`, transition: 'width 0.25s, background 0.25s',
              }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray)', marginTop: 4 }}>
              {overBudget ? `${totalPts - MAX_PTS} pts over limit!` : `${MAX_PTS - totalPts} pts remaining`}
            </div>
          </div>

          {/* Slots */}
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.5rem 0.65rem', marginBottom: '0.4rem', borderRadius: 5,
              background: selected[i] ? '#edf7f2' : 'var(--cream)',
              border: `1px solid ${selected[i] ? '#b3dfc5' : 'var(--border)'}`,
              fontSize: '0.88rem',
            }}>
              {selected[i]
                ? <><span>{selected[i].name}</span><span style={{ color: 'var(--gold)', fontWeight: 700 }}>{selected[i].points}pt</span></>
                : <span style={{ color: '#bbb' }}>Pick #{i + 1}…</span>
              }
            </div>
          ))}

          {/* Entry config */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div>
              <label style={labelSm}>Entry name</label>
              <input className="input" value={entryName} onChange={e => setEntryName(e.target.value)} style={{ fontSize: '0.88rem' }} />
            </div>
            <div>
              <label style={labelSm}>Entry #</label>
              <select className="input" value={entryNum} onChange={e => { setEntryNum(+e.target.value); setEntryName(entryName.replace(/#\d/, `#${e.target.value}`)) }} style={{ fontSize: '0.88rem' }}>
                <option value={1}>Entry #1</option>
                <option value={2}>Entry #2 (+$20)</option>
                <option value={3}>Entry #3 (+$20)</option>
              </select>
            </div>
          </div>

          {error && <p className="error">⚠ {error}</p>}
          {success && <p className="success">✓ {success}</p>}

          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || selected.length !== 4 || overBudget || poolLocked}
            style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
          >
            {saving ? 'Saving…' : '⛳  Submit Entry'}
          </button>

          <p style={{ fontSize: '0.78rem', color: 'var(--gray)', textAlign: 'center', marginTop: '0.6rem' }}>
            Pay $20/entry · Venmo @KirkOliver
          </p>
          <a href="/leaderboard" style={{ display: 'block', textAlign: 'center', fontSize: '0.85rem', marginTop: '0.4rem' }}>
            View Leaderboard →
          </a>
        </div>

      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '0.6rem 0.8rem', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.03em', textAlign: 'left' }
const td: React.CSSProperties = { padding: '0.5rem 0.8rem', borderBottom: '1px solid var(--border)' }
const labelSm: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }
