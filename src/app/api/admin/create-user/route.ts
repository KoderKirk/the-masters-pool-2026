import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verify caller is an admin using their anon-key session
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user: caller } } = await anonClient.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await anonClient.from('profiles').select('is_admin').eq('id', caller.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Create the new user with the service role key (does not affect any session)
  const { display_name, email, password } = await req.json()
  if (!display_name || !email || !password) {
    return NextResponse.json({ error: 'display_name, email, and password are required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { error: profileErr } = await adminClient.from('profiles').upsert({
    id: data.user.id,
    display_name,
    is_admin: false,
    payment_status: 'pending',
  }, { onConflict: 'id' })
  if (profileErr) return NextResponse.json({ error: 'User created but profile failed: ' + profileErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, user_id: data.user.id })
}
