'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { id: string; display_name: string; email: string | null; is_admin: boolean; payment_status: string; payment_method: string | null; payment_handle: string | null }
type Entry   = { id: string; user_id: string; entry_name: string; total_points_used: number; is_locked: boolean; golfer_1_id: string; golfer_2_id: string; golfer_3_id: string; golfer_4_id: string }
type Golfer  = { id: string; name: string; points: number; current_score: number; made_cut: boolean | null; position: string | null }

export default function AdminPage() {
  const router = useRouter()
  const [ok, setOk] = useState(false)
  const [tab, setTab] = useState<'entries' | 'payments' | 'scores'>('entries')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [golfers, setGolfers] = useState<Golfer[]>([])
  const [scores, setScores] = useState<Record<string, string>>({})
  const [cut, setCut] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showLeader, setShowLeader] = useState(false)

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

  async function updatePayment(id: string, status: 'paid' | 'pending') {
    const { error } = await supabase.from('profiles').update({ payment_status: status }).eq('id', id)
    if (error) {
      setMsg(`⚠ Failed to update payment: ${error.message}`)
      return
    }
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, payment_status: status } : p))
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
    setMsg(next ? 'Leaders ON — names now visible on dashboard.' : 'Leaders OFF — names hidden.')
  }

  async function unlockAll() {
    await supabase.from('entries').update({ is_locked: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    setEntries(prev => prev.map(e => ({ ...e, is_locked: false })))
    setMsg('All entries unlocked.')
  }

  function exportScores() {
    const sorted = [...golfers].sort((a, b) => a.name.split(' ').pop()!.localeCompare(b.name.split(' ').pop()!))
    const rows = [
      ['Player', 'Cost', 'Score', 'Cut Status'],
      ...sorted.map(g => [
        g.name,
        g.points,
        scores[g.id] ?? '0',
        cut[g.id] === 'yes' ? 'Made Cut' : cut[g.id] === 'no' ? 'Missed Cut' : 'TBD',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masters-scores-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportUsers() {
    const golferMap = Object.fromEntries(golfers.map(g => [g.id, g.name]))
    const rows = [
      ['Entry Name', 'Player Name', 'Email', 'Golfer 1', 'G1 Pts', 'Golfer 2', 'G2 Pts', 'Golfer 3', 'G3 Pts', 'Golfer 4', 'G4 Pts', 'Payment Status', 'Payment Method', 'Payment Handle', 'Amount Owed'],
      ...entries.map(e => {
        const p = profiles.find(pr => pr.id === e.user_id)
        const userEntryCount = entries.filter(en => en.user_id === e.user_id).length
        const g1 = golfers.find(g => g.id === e.golfer_1_id)
        const g2 = golfers.find(g => g.id === e.golfer_2_id)
        const g3 = golfers.find(g => g.id === e.golfer_3_id)
        const g4 = golfers.find(g => g.id === e.golfer_4_id)
        return [
          e.entry_name,
          p?.display_name ?? '',
          p?.email ?? '',
          g1?.name ?? '', g1?.points ?? '',
          g2?.name ?? '', g2?.points ?? '',
          g3?.name ?? '', g3?.points ?? '',
          g4?.name ?? '', g4?.points ?? '',
          p?.payment_status ?? '',
          p?.payment_method ?? '',
          p?.payment_handle ?? '',
          `$${userEntryCount * 20}`,
        ]
      }),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `masters-pool-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteEntry(id: string, name: string) {
    if (!window.confirm(`Delete entry "${name}"?\n\nThis cannot be undone.`)) return
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) { setMsg(`⚠ Failed to delete: ${error.message}`); return }
    setEntries(prev => prev.filter(e => e.id !== id))
    setMsg(`Entry "${name}" deleted.`)
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

      {/* Tabs + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--green)', marginBottom: 0 }}>
        {(['entries', 'payments', 'scores'] as const).map(t => (
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

      {msg && <p className={msg.startsWith('⚠') ? 'error' : 'success'} style={{ padding: '0.5rem 0' }}>{msg.startsWith('⚠') ? msg : `✓ ${msg}`}</p>}

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>

        {/* Entries tab */}
        {tab === 'entries' && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead style={{ background: 'var(--cream-dark)' }}>
              <tr>{['#', 'Entry', 'G1', 'G2', 'G3', 'G4', 'Pts', 'Locked', ''].map(h => <th key={h} style={th2}>{h}</th>)}</tr>
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
                    <td style={td2}>
                      <button
                        onClick={() => deleteEntry(e.id, e.entry_name)}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', background: 'none', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </td>
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
              <tr>{['Player', 'Entries', 'Owes', 'Payment', 'Status', ''].map(h => <th key={h} style={th2}>{h}</th>)}</tr>
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
                      {p.payment_method && p.payment_handle
                        ? <span style={{ fontSize: '0.82rem' }}><span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.payment_method}</span>: {p.payment_handle}</span>
                        : <span style={{ color: '#bbb', fontSize: '0.8rem' }}>—</span>}
                    </td>
                    <td style={td2}>
                      <span className={`tag ${paid ? 'tag-green' : 'tag-gold'}`}>{p.payment_status}</span>
                    </td>
                    <td style={td2}>
                      {paid
                        ? <button className="btn btn-ghost" onClick={() => updatePayment(p.id, 'pending')} style={{ padding: '3px 10px', fontSize: '0.8rem', color: 'var(--red)', borderColor: 'var(--red)' }}>Undo</button>
                        : <button className="btn btn-primary" onClick={() => updatePayment(p.id, 'paid')} style={{ padding: '3px 10px', fontSize: '0.8rem' }}>Mark Paid</button>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ color: 'var(--gray)', fontSize: '0.88rem', margin: 0 }}>
                Enter scores vs par (e.g. -5 for 5 under). Set cut status after Friday's round.
              </p>
              <button className="btn btn-ghost" onClick={exportScores} style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', whiteSpace: 'nowrap', marginLeft: '1rem' }}>
                📥 Export Scores
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem', maxHeight: 480, overflowY: 'auto' }}>
              {[...golfers].sort((a, b) => a.name.split(' ').pop()!.localeCompare(b.name.split(' ').pop()!)).map(g => (
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

      </div>
    </div>
  )
}

const th2: React.CSSProperties = { padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.78rem', color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }
const td2: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.87rem' }
