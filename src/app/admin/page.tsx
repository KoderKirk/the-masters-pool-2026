'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; display_name: string; email: string | null; is_admin: boolean; payment_status: string }
type Entry   = { id: string; user_id: string; entry_name: string; total_points_used: number; is_locked: boolean; golfer_1_id: string; golfer_2_id: string; golfer_3_id: string; golfer_4_id: string }
type Golfer  = { id: string; name: string; points: number; current_score: number; made_cut: boolean | null; position: string | null }

export default function AdminPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'entries' | 'payments' | 'scores' | 'accounts'>('entries')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [cut, setCut] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showLeader, setShowLeader] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPaid, setNewPaid] = useState(false)
  const [newGolferIds, setNewGolferIds] = useState(['', '', '', ''])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p?.is_admin) { router.push('/'); return }
      setOk(true)
      const [{ data: ps }, { data: es }, { data: gs }, { data: sl }] = await Promise.all([
        supabase.from('profiles').select('*').order('display_name'),
        supabase.from('entries').select('*').order('created_at'),
        supabase.from('golfers').select('*').order('points', { ascending: false }),
        supabase.from('pool_settings').select('value').eq('key', 'show_leader').single(),
      ])
      if (ps) setProfiles(ps)
      if (es) setEntries(es)
      if (sl) setShowLeader(!!sl.value)
      if (gs) {
        setGolfers(gs)
        const s: Record<string, string> = {}
        const c: Record<string, string> = {}
        gs.forEach(g => {
          s[g.id] = String(g.current_score ?? 0)
          c[g.id] = g.made_cut === true ? 'yes' : g.made_cut === false ? 'no' : 'tbd'
        })
        setScores(s); setCut(c)
      }
    }
    init()
  }, [router])

  async function markPaid(id: string) {
    await supabase.from('profiles').update({ payment_status: 'paid' }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, payment_status: 'paid' } : p))
  }

  async function markUnpaid(id: string) {
    await supabase.from('profiles').update({ payment_status: 'pending' }).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, payment_status: 'pending' } : p))
  }

  async function saveScores() {
    setSaving(true); setMsg('')
    for (const g of golfers) {
      const s = parseInt(scores[g.id] ?? '0', 10) || 0
      const mc = cut[g.id] === 'yes' ? true : cut[g.id] === 'no' ? false : null
      await supabase.from('golfers').update({ current_score: s, made_cut: mc, updated_at: new Date().toISOString() }).eq('id', g.id)
    }
    setSaving(false); setMsg('Scores saved!')
  }

  async function lockAll() {
    await supabase.from('entries').update({ is_locked: true }).neq('id', '00000000-0000-0000-0000-000000000000')
    setEntries(prev => prev.map(e => ({ ...e, is_locked: true })))
    setMsg('All entries locked.')
  }

  async function toggleShowLeader() {
    const next = !showLeader
    const { error } = await supabase.from('pool_settings').upsert({ key: 'show_leader', value: next }, { onConflict: 'key' })
    if (error) { setMsg(`⚠ Failed to save: ${error.message}`); return }
    setShowLeader(next)
    setMsg(next ? '✓ Leaders ON — names now visible on dashboard.' : '✓ Leaders OFF — names hidden.')
  }

  async function unlockAll() {
    await supabase.from('entries').update({ is_locked: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    setEntries(prev => prev.map(e => ({ ...e, is_locked: false })))
    setMsg('All entries unlocked.')
  }

  function exportUsers() {
    const rows = [
      ['Name', 'Email', 'Payment Status', 'Entries', 'Amount Owed'],
      ...profiles.map(p => {
        const n = entries.filter(e => e.user_id === p.id).length
        return [p.display_name, p.email ?? '', p.payment_status, n, `$${n * 20}`]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masters-pool-users-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const newTotalPts = newGolferIds.reduce((sum, id) => {
    const g = golfers.find(g => g.id === id)
    return sum + (g?.points ?? 0)
  }, 0)

  async function createEntry(e: React.FormEvent) {
    e.preventDefault()
    if (newGolferIds.some(id => !id)) { setMsg('⚠ Select all 4 golfers.'); return }
    if (new Set(newGolferIds).size !== 4) { setMsg('⚠ Each golfer must be different.'); return }
    if (newTotalPts > 50) { setMsg('⚠ Total points exceed 50.'); return }
    setCreating(true); setMsg('')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        display_name: newName,
        payment_status: newPaid ? 'paid' : 'pending',
        golfer_1_id: newGolferIds[0],
        golfer_2_id: newGolferIds[1],
        golfer_3_id: newGolferIds[2],
        golfer_4_id: newGolferIds[3],
        total_points_used: newTotalPts,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setMsg(`⚠ ${json.error}`); setCreating(false); return }
    setMsg(`✓ Entry added for ${newName}.`)
    setNewName(''); setNewPaid(false); setNewGolferIds(['', '', '', ''])
    const [{ data: ps }, { data: es }] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('entries').select('*').order('created_at'),
    ])
    if (ps) setProfiles(ps)
    if (es) setEntries(es)
    setCreating(false)
  }

  if (!ok) return <div className="page" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--gray)' }}>Checking access…</div>

  const pot = entries.length * 20
  const paid = profiles.filter(p => p.payment_status === 'paid').length

  return (
    <div className="page fade-in" style={{ paddingTop: '2rem' }}>
      <h1 style={{ color: 'var(--green)', marginBottom: '0.25rem' }}>🛠 Admin</h1>
      <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>Masters Pool 2026 · Kirk only</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {[
          { icon: '📋', label: 'Entries', val: entries.length },
          { icon: '👤', label: 'Players', val: profiles.length },
          { icon: '💰', label: 'Paid', val: `${paid}/${profiles.length}` },
          { icon: '🏆', label: 'Pot', val: `$${pot}` },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '1.4rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'Playfair Display, serif' }}>{s.val}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + lock button */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--green)', marginBottom: 0 }}>
        {(['entries', 'payments', 'scores', 'accounts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.55rem 1.1rem', border: 'none', cursor: 'pointer',
            background: tab === t ? 'var(--green)' : 'transparent',
            color: tab === t ? '#fff' : 'var(--green)',
            fontWeight: 600, fontSize: '0.88rem', borderRadius: '4px 4px 0 0',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={exportUsers} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
            📥 Export Users
          </button>
          <button className="btn btn-ghost" onClick={toggleShowLeader} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', background: showLeader ? '#e6f2ed' : undefined }}>
            {showLeader ? '👁 Leaders: ON' : '👁 Leaders: OFF'}
          </button>
          <button className="btn btn-ghost" onClick={unlockAll} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
            🔓 Unlock All
          </button>
          <button className="btn btn-danger" onClick={lockAll} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
            🔒 Lock All Entries
          </button>
        </div>
      </div>

      {msg && <p className="success" style={{ padding: '0.5rem 0' }}>✓ {msg}</p>}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>

        {/* Entries tab */}
        {tab === 'entries' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead style={{ background: 'var(--cream-dark)' }}>
              <tr>{['#', 'Entry', 'G1', 'G2', 'G3', 'G4', 'Pts', 'Locked'].map(h => <th key={h} style={th2}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const gName = (id: string) => golfers.find(g => g.id === id)?.name?.split(' ').pop() ?? '—'
                return (
                  <tr key={e.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={td2}>{i + 1}</td>
                    <td style={td2}>{e.entry_name}</td>
                    <td style={td2}>{gName(e.golfer_1_id)}</td>
                    <td style={td2}>{gName(e.golfer_2_id)}</td>
                    <td style={td2}>{gName(e.golfer_3_id)}</td>
                    <td style={td2}>{gName(e.golfer_4_id)}</td>
                    <td style={{ ...td2, color: 'var(--gold)', fontWeight: 700 }}>{e.total_points_used}</td>
                    <td style={td2}>{e.is_locked ? '🔒' : '✏️'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Payments tab */}
        {tab === 'payments' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead style={{ background: 'var(--cream-dark)' }}>
              <tr>{['Player', 'Entries', 'Owes', 'Status', ''].map(h => <th key={h} style={th2}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => {
                const n = entries.filter(e => e.user_id === p.id).length
                const paid = p.payment_status === 'paid'
                return (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={td2}>{p.display_name}</td>
                    <td style={td2}>{n}</td>
                    <td style={td2}>${n * 20}</td>
                    <td style={td2}>
                      <span className={`tag ${paid ? 'tag-green' : 'tag-gold'}`}>{p.payment_status}</span>
                    </td>
                    <td style={td2}>
                      {paid
                        ? <button className="btn btn-ghost" onClick={() => markUnpaid(p.id)} style={{ padding: '3px 10px', fontSize: '0.8rem', color: 'var(--red)', borderColor: 'var(--red)' }}>Undo</button>
                        : <button className="btn btn-primary" onClick={() => markPaid(p.id)} style={{ padding: '3px 10px', fontSize: '0.8rem' }}>Mark Paid</button>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Scores tab */}
        {tab === 'scores' && (
          <div style={{ padding: '1.25rem' }}>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Enter scores vs par (e.g. -5 for 5 under). Set cut status after Friday's round.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', maxHeight: 480, overflowY: 'auto' }}>
              {golfers.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.6rem', background: 'var(--cream)', borderRadius: 5, border: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600 }}>{g.name.split(' ').pop()}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>{g.points}pt</span>
                  <input
                    type="number"
                    value={scores[g.id] ?? '0'}
                    onChange={e => setScores(p => ({ ...p, [g.id]: e.target.value }))}
                    style={{ width: 50, padding: '3px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.85rem', textAlign: 'center' }}
                  />
                  <select
                    value={cut[g.id] ?? 'tbd'}
                    onChange={e => setCut(p => ({ ...p, [g.id]: e.target.value }))}
                    style={{ padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.75rem' }}
                  >
                    <option value="tbd">TBD</option>
                    <option value="yes">MC ✓</option>
                    <option value="no">Cut ✗</option>
                  </select>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={saveScores} disabled={saving} style={{ marginTop: '1.25rem', padding: '0.7rem 2rem' }}>
              {saving ? 'Saving…' : '💾 Save All Scores'}
            </button>
          </div>
        )}
        {/* Accounts tab */}
        {tab === 'accounts' && (
          <div style={{ padding: '1.5rem', maxWidth: 460 }}>
            <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Add an entry on behalf of a player who can't use the app.
            </p>
            <form onSubmit={createEntry} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={labelAdmin}>Player Name</label>
                <input className="input" placeholder="e.g. John Smith" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>

              <div>
                <label style={labelAdmin}>Golfers <span style={{ color: newTotalPts > 50 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>({newTotalPts} / 50 pts)</span></label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {[0, 1, 2, 3].map(i => (
                    <select
                      key={i}
                      className="input"
                      value={newGolferIds[i]}
                      onChange={e => setNewGolferIds(prev => { const next = [...prev]; next[i] = e.target.value; return next })}
                      style={{ fontSize: '0.88rem' }}
                    >
                      <option value="">— Pick #{i + 1} —</option>
                      {golfers.map(g => (
                        <option
                          key={g.id}
                          value={g.id}
                          disabled={newGolferIds.some((id, j) => id === g.id && j !== i)}
                        >
                          {g.name} ({g.points}pt)
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={labelAdmin}>Payment</label>
                <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                  {(['pending', 'paid'] as const).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewPaid(s === 'paid')}
                      style={{
                        padding: '0.35rem 0.9rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                        background: (s === 'paid') === newPaid ? 'var(--green)' : 'transparent',
                        color: (s === 'paid') === newPaid ? '#fff' : 'var(--gray)',
                      }}
                    >
                      {s === 'paid' ? '✓ Paid' : 'Pending'}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" type="submit" disabled={creating || !newName.trim() || newTotalPts > 50} style={{ padding: '0.7rem 1.5rem', marginTop: '0.25rem' }}>
                {creating ? 'Saving…' : '➕ Add Entry'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

const labelAdmin: React.CSSProperties = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }
const th2: React.CSSProperties = { padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }
const td2: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.87rem' }
