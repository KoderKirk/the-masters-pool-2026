import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token || token === 'undefined') {
      return NextResponse.json({ error: 'Unauthorized — no session token' }, { status: 401 })
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user: caller }, error: callerErr } = await anonClient.auth.getUser()
    if (!caller) {
      return NextResponse.json({ error: `Unauthorized — ${callerErr?.message ?? 'invalid token'}` }, { status: 401 })
    }

    const { data: profile } = await anonClient.from('profiles').select('is_admin').eq('id', caller.id).single()
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden — not an admin' }, { status: 403 })
    }

    const { display_name, email, password } = await req.json()
    if (!display_name || !email || !password) {
      return NextResponse.json({ error: 'display_name, email, and password are required' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
    }

    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { data, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const { error: profileErr } = await adminClient.from('profiles').upsert({
      id: data.user.id,
      display_name,
      is_admin: false,
      payment_status: 'pending',
    }, { onConflict: 'id' })
    if (profileErr) return NextResponse.json({ error: 'User created but profile failed: ' + profileErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, user_id: data.user.id })

  } catch (err) {
    console.error('Admin create-user error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
