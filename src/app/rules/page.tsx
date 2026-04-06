'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Golfer = { id: string; name: string; points: number }

export default function RulesPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [golfers, setGolfers] = useState<Golfer[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAuthed(!!user))
    supabase.from('golfers').select('id, name, points').order('points', { ascending: false }).then(({ data }) => {
      if (data) setGolfers(data)
    })
  }, [])

  const th: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray)', borderBottom: '2px solid var(--border)' }
  const td: React.CSSProperties = { padding: '0.45rem 0.75rem', fontSize: '0.9rem', borderBottom: '1px solid var(--border)' }

  return (
    <div className="page fade-in" style={{ paddingTop: '2.5rem', maxWidth: 680 }}>
      <h1 style={{ color: 'var(--green)', marginBottom: '0.25rem' }}>📋 Rules & Golfers</h1>
      <p style={{ color: 'var(--gray)', fontSize: '0.88rem', marginBottom: '2rem' }}>Masters Pool 2026 · Augusta National</p>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Picking Your Team</h2>
        <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li>Pick <strong>4 golfers</strong> for each entry · combined points must be <strong>≤ 50</strong></li>
          <li>Up to <strong>3 entries</strong> per person · <strong>$20 each</strong></li>
          <li>Entries lock <strong>Thursday 5am PT</strong> — no changes after that</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Scoring</h2>
        <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li>Your team score = <strong>best 3 of 4 golfer scores</strong> — the worst score is dropped</li>
          <li>Lowest cumulative team score wins</li>
          <li>Need <strong>≥ 3 active golfers</strong> (made cut or TBD) or your entry is <strong>DQ'd</strong></li>
          <li>Tiebreaker: entry whose team included the tournament winner</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Payouts</h2>
        <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li><strong>1st place</strong> — 65% of the pot</li>
          <li><strong>2nd place</strong> — 25% of the pot</li>
          <li><strong>3rd place</strong> — 10% of the pot</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Payment</h2>
        <ul style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li>Send <strong>$20 per entry</strong> to Kirk before the Thursday deadline</li>
          <li><strong>Venmo:</strong> @KirkOliver</li>
          <li><strong>PayPal:</strong> kirko005@gmail.com (Friends &amp; Family)</li>
          <li>Enter your Venmo handle or PayPal email on the My Picks page so we can match your payment</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Updates</h2>
        <ul style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li>Check this site throughout the weekend</li>
          <li>Player scores will be updated at the end of each day's rounds</li>
          <li>Email commentary will be emailed out as in previous years</li>
        </ul>
      </div>

      {/* Golfer roster */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '2px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--green)', margin: 0 }}>2026 Player Costs</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.25rem 0 0' }}>{golfers.length} players · combined cost per entry must be ≤ 50</p>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
              <tr>
                <th style={th}>#</th>
                <th style={th}>Player</th>
                <th style={{ ...th, textAlign: 'right' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {golfers.map((g, i) => (
                <tr key={g.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ ...td, color: 'var(--gray)', width: 36 }}>{i + 1}</td>
                  <td style={td}>{g.name}</td>
                  <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: 'var(--green)', paddingRight: '1rem' }}>{g.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sign up CTA — only when logged out */}
      {authed === false && (
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <a href="/" className="btn btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-block' }}>
            Join the Pool
          </a>
        </div>
      )}
    </div>
  )
}
