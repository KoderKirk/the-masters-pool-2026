'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const MAX_PTS = 50

type Golfer = { id: string; name: string; points: number; current_score: number }
type SavedEntry = {
  id: string; entry_number: number; entry_name: string; total_points_used: number; is_locked: boolean
  golfer_1_id: string; golfer_2_id: string; golfer_3_id: string; golfer_4_id: string
}
type LbEntry = {
  entry_id: string; entry_name: string; place: number; team_score: number; is_disqualified: boolean
  golfer_1: string; score_1: number; golfer_2: string; score_2: number
  golfer_3: string; score_3: number; golfer_4: string; score_4: number
  total_points_used: number
}

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
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([])
  const [lbEntries, setLbEntries] = useState<LbEntry[]>([])
  const [displayName, setDisplayName] = useState('')
  const [editingNum, setEditingNum] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'venmo' | 'paypal' | ''>('')
  const [paymentHandle, setPaymentHandle] = useState('')
  const [paymentSaved, setPaymentSaved] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string>('pending')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      let { data: profile } = await supabase.from('profiles').select('display_name,payment_status,payment_method,payment_handle').eq('id', user.id).single()
      if (!profile) {
        const dn = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Player'
        await supabase.from('profiles').upsert({ id: user.id, display_name: dn, payment_status: 'pending' }, { onConflict: 'id' })
        profile = { display_name: dn, payment_status: 'pending', payment_method: null, payment_handle: null }
      }
      setDisplayName(profile.display_name)
      setEntryName(`${profile.display_name} #1`)
      setPaymentStatus(profile.payment_status ?? 'pending')
      if (profile.payment_method) setPaymentMethod(profile.payment_method as 'venmo' | 'paypal')
      if (profile.payment_handle) setPaymentHandle(profile.payment_handle)

      const [{ data: golferData }, { data: anyLocked }, { data: existingEntries }, { data: lb }] = await Promise.all([
        supabase.from('golfers').select('id,name,points,current_score').order('points', { ascending: false }),
        supabase.from('entries').select('id').eq('is_locked', true).limit(1),
        supabase.from('entries').select('*').eq('user_id', user.id).order('entry_number'),
        supabase.from('entry_leaderboard').select('*').eq('user_id', user.id).order('place'),
      ])
      if (golferData) setGolfers(golferData)
      if (anyLocked && anyLocked.length > 0) setPoolLocked(true)
      if (existingEntries) setSavedEntries(existingEntries)
      if (lb) setLbEntries(lb)
      setLoading(false)
    }
    init()
  }, [router])

  function loadEntryForEdit(entry: SavedEntry) {
    const find = (id: string) => golfers.find(g => g.id === id) ?? null
    const picks = [find(entry.golfer_1_id), find(entry.golfer_2_id), find(entry.golfer_3_id), find(entry.golfer_4_id)].filter(Boolean) as Golfer[]
    setSelected(picks)
    setEntryName(entry.entry_name)
    setEntryNum(entry.entry_number)
    setEditingNum(entry.entry_number)
    setError(''); setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPts = selected.reduce((s, g) => s + g.points, 0)
  const pct = Math.min((totalPts / MAX_PTS) * 100, 100)
  const overBudget = totalPts > MAX_PTS

  function toggle(g: Golfer) {
    if (selected.find(s => s.id === g.id)) { setSelected(selected.filter(s => s.id !== g.id)); setError(''); return }
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

    // Refresh saved entries
    const { data: updated } = await supabase.from('entries').select('*').eq('user_id', userId!).order('entry_number')
    if (updated) setSavedEntries(updated)

    setSuccess('Entry saved! 🎉  Remember to pay $20 via Venmo @KirkOliver')
    setEditingNum(null)
    // Reset form to next available entry
    const taken = (updated ?? []).map(e => e.entry_number)
    const next = [1, 2, 3].find(n => !taken.includes(n)) ?? 1
    setEntryNum(next)
    setEntryName(`${displayName} #${next}`)
    setSelected([])
  }

  async function deleteEntry(entry: SavedEntry) {
    if (!window.confirm(`Delete "${entry.entry_name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if (error) { setError(error.message); return }
    const updated = savedEntries.filter(e => e.id !== entry.id)
    setSavedEntries(updated)
    // Reset form if the deleted entry was being edited
    if (editingNum === entry.entry_number) {
      setSelected([]); setEditingNum(null)
      const next = [1, 2, 3].find(n => !updated.map(e => e.entry_number).includes(n)) ?? 1
      setEntryNum(next); setEntryName(`${displayName} #${next}`)
    }
    setSuccess(`Entry deleted.`)
  }

  async function savePaymentInfo() {
    if (!userId || !paymentMethod || !paymentHandle.trim()) return
    await supabase.from('profiles').update({ payment_method: paymentMethod, payment_handle: paymentHandle.trim() }).eq('id', userId)
    setPaymentSaved(true)
    setTimeout(() => setPaymentSaved(false), 2000)
  }

  const filtered = golfers.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="page" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--gray)' }}>Loading roster…</div>

  if (poolLocked) return (
    <div className="page fade-in" style={{ paddingTop: '2.5rem', maxWidth: 680 }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✂️</div>
        <h1 style={{ color: 'var(--red)', marginBottom: '0.4rem' }}>You Missed the Cut</h1>
        <p style={{ color: 'var(--gray)', fontSize: '0.92rem' }}>
          Entries are locked — the Masters has started. No changes allowed.
        </p>
      </div>

      {lbEntries.length > 0 ? (
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            Your Entries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {lbEntries.map(row => {
              const golferCols = [
                { name: row.golfer_1, score: row.score_1 },
                { name: row.golfer_2, score: row.score_2 },
                { name: row.golfer_3, score: row.score_3 },
                { name: row.golfer_4, score: row.score_4 },
              ]
              const placeColor = row.is_disqualified ? 'var(--red)' : row.place === 1 ? 'var(--gold)' : row.place === 2 ? '#888' : row.place === 3 ? '#CD7F32' : 'var(--gray)'
              const scoreColor = (row.team_score ?? 0) < 0 ? 'var(--red)' : (row.team_score ?? 0) === 0 ? 'var(--dark)' : '#3a6ea5'
              return (
                <div key={row.entry_id} className="card" style={{ padding: '1rem 1.25rem', border: `2px solid ${row.is_disqualified ? 'var(--red)' : 'var(--border)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 36, height: 36, borderRadius: '50%', fontWeight: 700, fontSize: '0.9rem',
                        background: row.is_disqualified ? '#fdeaea' : row.place <= 3 ? placeColor : 'var(--cream-dark)',
                        color: row.is_disqualified ? 'var(--red)' : row.place <= 3 ? '#fff' : 'var(--gray)',
                      }}>
                        {row.is_disqualified ? 'DQ' : row.place}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--dark)' }}>{row.entry_name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--gray)' }}>{row.total_points_used}pt used</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.4rem', color: scoreColor }}>
                      {(row.team_score ?? 0) === 0 ? 'E' : (row.team_score ?? 0) > 0 ? `+${row.team_score}` : row.team_score}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {golferCols.map((g, i) => (
                      <div key={i} style={{ background: 'var(--cream)', border: '1px solid var(--border)', borderRadius: 5, padding: '0.4rem 0.6rem', fontSize: '0.82rem', textAlign: 'center' }}>
                        <div style={{ fontWeight: 600 }}>{g.name?.split(' ').pop()}</div>
                        <div style={{ color: (g.score ?? 0) < 0 ? 'var(--red)' : '#3a6ea5', fontWeight: 700, fontSize: '0.9rem' }}>
                          {(g.score ?? 0) === 0 ? 'E' : (g.score ?? 0) > 0 ? `+${g.score}` : g.score}
                        </div>
                      </div>
                    ))}
                  </div>
                  {row.is_disqualified && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--red)', fontStyle: 'italic' }}>
                      Disqualified — fewer than 3 golfers made the cut.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.88rem', color: 'var(--gray)' }}>
            <a href="/leaderboard">View full leaderboard →</a>
          </p>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '0.92rem' }}>
          You didn't submit any entries. <a href="/leaderboard">View the leaderboard →</a>
        </p>
      )}
    </div>
  )

  return (
    <div className="page fade-in" style={{ paddingTop: '2rem' }}>
      <h1 style={{ color: 'var(--green)', marginBottom: '0.25rem' }}>Build Your Foursome</h1>
      <p style={{ color: 'var(--gray)', marginBottom: savedEntries.length > 0 ? '1.25rem' : '1.75rem', fontSize: '0.92rem' }}>
        Select 4 golfers · Total ≤ 50 points · Deadline Thursday 5am PT
      </p>

      {/* Submitted entries */}
      {savedEntries.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            Your Entries
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {savedEntries.map(entry => {
              const picks = [entry.golfer_1_id, entry.golfer_2_id, entry.golfer_3_id, entry.golfer_4_id]
                .map(id => golfers.find(g => g.id === id))
                .filter(Boolean) as Golfer[]
              const isEditing = editingNum === entry.entry_number
              return (
                <div key={entry.id} style={{
                  background: isEditing ? '#edf7f2' : 'var(--white)',
                  border: `2px solid ${isEditing ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '0.85rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--green)', fontSize: '0.9rem', minWidth: 100 }}>
                    {entry.entry_name}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, flexWrap: 'wrap' }}>
                    {picks.map(g => (
                      <div key={g.id} style={{
                        background: 'var(--cream)', border: '1px solid var(--border)',
                        borderRadius: 5, padding: '0.3rem 0.65rem', fontSize: '0.82rem',
                        display: 'flex', gap: '0.4rem', alignItems: 'center',
                      }}>
                        <span>{g.name}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{g.points}pt</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{entry.total_points_used}pt used</span>
                    {isEditing
                      ? <span style={{ fontSize: '0.8rem', color: 'var(--green)', fontWeight: 600 }}>Editing…</span>
                      : <button onClick={() => loadEntryForEdit(entry)} className="btn btn-ghost" style={{ padding: '0.25rem 0.8rem', fontSize: '0.8rem' }}>Edit</button>
                    }
                    {!poolLocked && !isEditing && (
                      <button
                        onClick={() => deleteEntry(entry)}
                        style={{ padding: '0.25rem 0.7rem', fontSize: '0.8rem', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Rules + Payment Info — side by side */}
      <div className="mobile-1col" style={{ display: 'grid', gridTemplateColumns: paymentStatus !== 'paid' ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <h3 style={{ color: 'var(--green)', marginBottom: '0.6rem', fontSize: '0.95rem' }}>📋 Quick Rules</h3>
          <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 1.9, fontSize: '0.85rem', margin: 0 }}>
            <li>Pick <strong>4 golfers</strong> · combined points <strong>≤ 50</strong></li>
            <li>Best <strong>3 of 4</strong> scores count — worst dropped</li>
            <li>Need <strong>≥ 3 active golfers</strong> (made cut or TBD) or DQ'd</li>
            <li>Lowest team score wins · Tiebreaker: had the winner?</li>
            <li>Entries lock <strong>Thursday 5am PT</strong></li>
          </ol>
        </div>

        {paymentStatus !== 'paid' && (
          <div className="card" style={{ padding: '1rem 1.25rem', border: '2px solid var(--gold)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--green)', marginBottom: '0.5rem' }}>💳 Payment Info</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray)', marginBottom: '0.65rem' }}>
              Send $20/entry to Kirk, then enter your handle so we can match your payment.
            </div>
            <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 5, overflow: 'hidden', width: 'fit-content', marginBottom: '0.5rem' }}>
              {(['venmo', 'paypal'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPaymentMethod(m); setPaymentSaved(false) }}
                  style={{
                    padding: '0.35rem 1rem', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                    background: paymentMethod === m ? 'var(--green)' : 'transparent',
                    color: paymentMethod === m ? '#fff' : 'var(--gray)',
                  }}
                >
                  {m === 'venmo' ? 'Venmo' : 'PayPal'}
                </button>
              ))}
            </div>
            {paymentMethod && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  className="input"
                  placeholder={paymentMethod === 'venmo' ? '@your-handle' : 'your@email.com'}
                  value={paymentHandle}
                  onChange={e => { setPaymentHandle(e.target.value); setPaymentSaved(false) }}
                  onBlur={savePaymentInfo}
                  style={{ fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={savePaymentInfo}
                  disabled={!paymentHandle.trim()}
                  className="btn btn-ghost"
                  style={{ padding: '0.35rem 0.8rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                >
                  {paymentSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mobile-1col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

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
          <h2 style={{ fontSize: '1.15rem', color: 'var(--green)', marginBottom: '1rem' }}>
            {editingNum !== null ? `Editing Entry #${editingNum}` : 'New Entry'}
          </h2>

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
              <select className="input" value={entryNum} onChange={e => {
                const n = +e.target.value
                setEntryNum(n)
                setEntryName(entryName.replace(/#\d/, `#${n}`))
                // Load existing entry if it exists
                const existing = savedEntries.find(en => en.entry_number === n)
                if (existing) loadEntryForEdit(existing)
                else { setSelected([]); setEditingNum(null) }
              }} style={{ fontSize: '0.88rem' }}>
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
            {saving ? 'Saving…' : editingNum !== null ? '⛳  Update Entry' : '⛳  Submit Entry'}
          </button>

          <p style={{ fontSize: '0.78rem', color: 'var(--gray)', textAlign: 'center', marginTop: '0.6rem' }}>
            Pay $20/entry · Venmo @KirkOliver · PayPal kirko005@gmail.com
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
