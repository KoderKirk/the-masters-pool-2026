'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NavAuth() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setAuthed(!!user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!authed) return null

  return (
    <button
      onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
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
        transition: 'border-color 0.15s, opacity 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.45)')}
    >
      Sign Out
    </button>
  )
}
