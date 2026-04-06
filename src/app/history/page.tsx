'use client'

export default function HistoryPage() {
  return (
    <div className="page fade-in" style={{ paddingTop: '2.5rem', maxWidth: 720 }}>

      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green) 0%, #1a4a2e 100%)',
        borderRadius: 12,
        padding: '2.5rem 2rem',
        marginBottom: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
          backgroundSize: '12px 12px',
        }} />
        <p style={{ color: 'var(--gold)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>Est. in memory of</p>
        <h1 style={{
          fontFamily: 'Playfair Display, serif',
          fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
          color: '#fff',
          lineHeight: 1.2,
          marginBottom: '0.5rem',
        }}>
          The Cary Chiappone<br />Masters Pool
        </h1>
        <p style={{ color: 'var(--gold)', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em' }}>2026</p>
      </div>

      {/* Opening */}
      <div className="card" style={{ marginBottom: '1.25rem', borderLeft: '4px solid var(--gold)', paddingLeft: '1.5rem' }}>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '1rem', margin: 0 }}>
          Amen Corner. The par-3 contest. The roar that rolls through the pines before you even see what happened.
          There is no week in sports quite like this one.
        </p>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '1rem', margin: '1rem 0 0' }}>
          Augusta National doesn't change, and that's exactly the point. The same cathedral of Georgia pines.
          The same hush over the gallery as a birdie putt hangs on the lip. The same collective exhale when someone
          makes something improbable on 12. Year after year, the Masters delivers — and year after year, so do we.
        </p>
        <p style={{ color: 'var(--green)', fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', fontWeight: 700, margin: '1.25rem 0 0' }}>
          Welcome back to the Cary Chiappone Masters Pool.
        </p>
      </div>

      {/* About Cary */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.15rem', color: 'var(--green)', marginBottom: '1rem' }}>About Cary</h2>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '0.95rem', margin: '0 0 1rem' }}>
          For those who knew Cary, no explanation is needed. You already feel his absence and his presence in the same breath.
          For those who didn't, here's what you should know: Cary was the kind of person who made everything he touched more fun.
        </p>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '0.95rem', margin: '0 0 1rem' }}>
          He loved the Masters the way it deserves to be loved — deeply, completely, with an encyclopedic appreciation for the
          history and a genuine joy for the competition. He ran this pool, but more than that, he made it matter. He turned
          casual fans into diehards, sparked rivalries that lasted all weekend, and had a way of making you feel like your
          picks actually had a chance... right up until they didn't.
        </p>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '0.95rem', margin: 0 }}>
          We carry his name on this pool because we carry him with us. Every entry is a small tribute.
          Every year we grow, we think he'd get a kick out of it.
        </p>
      </div>

      {/* Record & call to action */}
      <div className="card" style={{ marginBottom: '1.25rem', background: '#f9f6ef', borderTop: '3px solid var(--gold)' }}>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '0.95rem', margin: 0 }}>
          Last year we shattered our own record with <strong>576 entries</strong> — and we're not done.
          If you know someone who loves this game, pass this along. The bigger this gets, the better the tribute.
        </p>
      </div>

      {/* Closing */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--green)', paddingLeft: '1.5rem' }}>
        <p style={{ color: 'var(--dark)', lineHeight: 1.85, fontSize: '0.95rem', margin: '0 0 1rem' }}>
          So lock in your picks. Trust your sleeper. And settle in for four days of the best golf on earth.
        </p>
        <p style={{ color: 'var(--green)', fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
          For Cary. For the tradition. And for the love of the game.
        </p>
      </div>

    </div>
  )
}
