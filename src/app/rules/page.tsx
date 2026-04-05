'use client'

export default function RulesPage() {
  return (
    <div className="page fade-in" style={{ paddingTop: '2.5rem', maxWidth: 680 }}>
      <h1 style={{ color: 'var(--green)', marginBottom: '0.25rem' }}>📋 Pool Rules</h1>
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
          <li>Need <strong>≥ 3 golfers to make the cut</strong> or your entry is <strong>DQ'd</strong></li>
          <li>Tiebreaker: entry whose team included the tournament winner</li>
        </ol>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Payouts</h2>
        <ol style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li><strong>1st place</strong> — 70% of the pot</li>
          <li><strong>2nd place</strong> — 20% of the pot</li>
          <li><strong>3rd place</strong> — 10% of the pot</li>
        </ol>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1rem', color: 'var(--green)', marginBottom: '0.85rem' }}>Payment</h2>
        <ul style={{ paddingLeft: '1.1rem', color: 'var(--gray)', lineHeight: 2.1, fontSize: '0.95rem' }}>
          <li>Send <strong>$20 per entry</strong> to Kirk before the Thursday deadline</li>
          <li><strong>Venmo:</strong> @KirkOliver</li>
          <li><strong>PayPal:</strong> kirko005@gmail.com (Friends &amp; Family)</li>
          <li>Enter your Venmo handle or PayPal email on the My Picks page so we can match your payment</li>
        </ul>
      </div>
    </div>
  )
}
