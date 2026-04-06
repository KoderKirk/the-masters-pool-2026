'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NavAuth() {
  const [authed, setAuthed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load(userId: string | null) {
      if (!userId) { setAuthed(false); setIsAdmin(false); return }
      setAuthed(true)
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
      setIsAdmin(!!data?.is_admin)
    }

    supabase.auth.getUser().then(({ data: { user } }) => load(user?.id ?? null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const linkStyle: React.CSSProperties = {
    color: '#fff', fontSize: '0.88rem', fontWeight: 400, opacity: 0.85, textDecoration: 'none',
  }

  async function signOut() {
    setOpen(false)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <>
      {/* Desktop nav */}
      <div className="nav-links">
        <a href="/history" style={linkStyle}>League History</a>
        <a href="/rules" style={linkStyle}>Rules &amp; Golfers</a>
        {authed && <a href="/" style={linkStyle}>Dashboard</a>}
        {authed && <a href="/leaderboard" style={linkStyle}>Leaderboard</a>}
        {authed && <a href="/pick" style={linkStyle}>My Picks</a>}
        {authed && isAdmin && <a href="/admin" style={linkStyle}>Admin</a>}
        {authed && (
          <button
            onClick={signOut}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.45)',
              color: '#fff',
              borderRadius: 4,
              padding: '0.3rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Source Sans 3, sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)')}
          >
            Sign Out
          </button>
        )}
      </div>

      {/* Hamburger button (mobile only) */}
      <button className="nav-hamburger" onClick={() => setOpen(o => !o)} aria-label="Menu">
        {open ? '✕' : '☰'}
      </button>

      {/* Mobile dropdown */}
      <div className={open ? 'nav-mobile-open' : 'nav-mobile-closed'}>
        <a href="/history" onClick={() => setOpen(false)}>League History</a>
        <a href="/rules" onClick={() => setOpen(false)}>Rules &amp; Golfers</a>
        {authed && <a href="/" onClick={() => setOpen(false)}>Dashboard</a>}
        {authed && <a href="/leaderboard" onClick={() => setOpen(false)}>Leaderboard</a>}
        {authed && <a href="/pick" onClick={() => setOpen(false)}>My Picks</a>}
        {authed && isAdmin && <a href="/admin" onClick={() => setOpen(false)}>Admin</a>}
        {authed && <button className="nav-signout" onClick={signOut}>Sign Out</button>}
      </div>
    </>
  )
}
