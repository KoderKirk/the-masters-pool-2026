'use client'
import { useState, useEffect } from 'react'
import { supabase, formatScore } from '../../lib/supabase'

type Row = {
  entry_id: string; entry_name: string; user_id: string; total_points_used: number
  golfer_1: string; score_1: number; cut_1: boolean | null
  golfer_2: string; score_2: number; cut_2: boolean | null
  golfer_3: string; score_3: number; cut_3: boolean | null
  golfer_4: string; score_4: number; cut_4: boolean | null
  team_score: number; is_disqualified: boolean; place: number
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [updated, setUpdated] = useState<Date | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [poolLocked, setPoolLocked] = useState(false)
  const [search, setSearch] = useState('')

  async function loadData() {
    const [{ data }, { data: locked }] = await Promise.all([
      supabase.from('entry_leaderboard').select('*').order('place'),
      supabase.from('entries').select('id').eq('is_locked', true).limit(1),
    ])
    const isLocked = !!(locked && locked.length > 0)
    setPoolLocked(isLocked)
    if (data) {
      const sorted = isLocked
        ? data
        : [...data].sort((a, b) => a.entry_name.localeCompare(b.entry_name))
      setRows(sorted)
      setUpdated(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    const ch = supabase.channel('lb')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'golfers' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const filteredRows = search.trim()
    ? rows.filter(r => {
        const q = search.toLowerCase()
        return (
          r.entry_name.toLowerCase().includes(q) ||
          [r.golfer_1, r.golfer_2, r.golfer_3, r.golfer_4].some(n => n?.toLowerCase().includes(q))
        )
      })
    : rows

  if (loading) return <div className="page" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--gray)' }}>Loading leaderboard…</div>

  return (
    <div className="page fade-in" style={{ paddingTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ color: 'var(--green)', marginBottom: '0.2rem' }}>🏆 Leaderboard</h1>
          <p style={{ color: 'var(--gray)', fontSize: '0.88rem' }}>
            Masters Pool 2026 · {rows.length} entries
            {!poolLocked && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>(alphabetical — rankings revealed after tee time)</span>}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#edf7f2', border: '1px solid #b3dfc5', borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', color: 'var(--green)', fontWeight: 600 }}>
            <span className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            LIVE
          </span>
          {updated && <div style={{ fontSize: '0.73rem', color: 'var(--gray)', marginTop: 3 }}>Updated {updated.toLocaleTimeString()}</div>}
        </div>
      </div>

      <input
        className="input"
        placeholder="🔍  Search entries or player names…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: '0.75rem', maxWidth: 340 }}
      />

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: 'var(--green)', color: '#fff' }}>
              <th style={{ ...th, textAlign: 'center', width: 52 }}>Pos</th>
              <th style={th}>Entry</th>
              <th style={{ ...th, textAlign: 'center' }}>Budget</th>
              <th style={{ ...th, textAlign: 'center' }}>Score</th>
              <th style={{ ...th, fontSize: '0.78rem' }}>Team</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, i) => {
              const isExp = expanded === row.entry_id
              const golfers = [
                { name: row.golfer_1, score: row.score_1, cut: row.cut_1 },
                { name: row.golfer_2, score: row.score_2, cut: row.cut_2 },
                { name: row.golfer_3, score: row.score_3, cut: row.cut_3 },
                { name: row.golfer_4, score: row.score_4, cut: row.cut_4 },
              ]
              const scoreColor = row.team_score < 0 ? 'var(--red)' : row.team_score === 0 ? 'var(--dark)' : '#3a6ea5'
              return (
                <>
                  <tr
                    key={row.entry_id}
                    onClick={() => setExpanded(isExp ? null : row.entry_id)}
                    style={{
                      background: row.is_disqualified ? '#fff8f8' : i % 2 === 0 ? '#fff' : '#fafaf8',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 30, height: 30, borderRadius: '50%', fontSize: '0.82rem', fontWeight: 700,
                        background: row.is_disqualified ? '#fdeaea'
                          : row.place === 1 ? 'var(--gold)'
                          : row.place === 2 ? '#C0C0C0'
                          : row.place === 3 ? '#CD7F32'
                          : 'var(--cream-dark)',
                        color: row.is_disqualified ? 'var(--red)'
                          : row.place <= 3 ? '#fff'
                          : 'var(--gray)',
                      }}>
                        {row.is_disqualified ? 'DQ' : row.place}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: row.place === 1 ? 700 : 400 }}>
                      {row.entry_name}
                      {row.is_disqualified && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--red)', fontStyle: 'italic' }}>(DQ)</span>}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: 'var(--gray)', fontSize: '0.82rem' }}>{row.total_points_used}pt</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: scoreColor }}>{formatScore(row.team_score)}</td>
                    <td style={{ ...td, fontSize: '0.8rem', color: 'var(--gray)' }}>
                      {golfers.map((g, idx) => (
                        <span key={idx} style={{ marginRight: 8 }}>
                          {g.name?.split(' ').pop()}
                          <span style={{ color: '#bbb', marginLeft: 2 }}>({formatScore(g.score)})</span>
                        </span>
                      ))}
                    </td>
                  </tr>
                  {isExp && (
                    <tr key={`${row.entry_id}-exp`}>
                      <td colSpan={5} style={{ padding: '1rem 1.25rem', background: '#f4fbf7', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                          {golfers.map((g, idx) => (
                            <div key={idx} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '0.85rem', marginBottom: 4, fontWeight: 600 }}>{g.name}</div>
                              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: (g.score ?? 0) < 0 ? 'var(--red)' : 'var(--dark)' }}>
                                {formatScore(g.score)}
                              </div>
                              {g.cut !== null && (
                                <div style={{ fontSize: '0.72rem', marginTop: 3, color: g.cut ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                                  {g.cut ? '✓ Made cut' : '✗ Missed cut'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--gray)' }}>
                          Best 3 of 4 scores count · Points budget: {row.total_points_used}/50
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '0.65rem 0.9rem', fontWeight: 600, fontSize: '0.82rem', letterSpacing: '0.03em', textAlign: 'left' }
const td: React.CSSProperties = { padding: '0.55rem 0.9rem', borderBottom: '1px solid var(--border)' }
