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

  const { display_name, payment_status, golfer_1_id, golfer_2_id, golfer_3_id, golfer_4_id, total_points_used } = await req.json()

  if (!display_name || !golfer_1_id || !golfer_2_id || !golfer_3_id || !golfer_4_id) {
    return NextResponse.json({ error: 'display_name and all 4 golfers are required' }, { status: 400 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create a placeholder auth account (no real email needed — admin-managed)
  const slug = display_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
  const placeholderEmail = `${slug}.${Date.now()}@masterspool.local`

  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email: placeholderEmail,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { display_name },
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  const userId = authData.user.id

  const { error: profileErr } = await adminClient.from('profiles').upsert({
    id: userId,
    display_name,
    is_admin: false,
    payment_status: payment_status ?? 'pending',
  }, { onConflict: 'id' })
  if (profileErr) return NextResponse.json({ error: 'Profile failed: ' + profileErr.message }, { status: 500 })

  const { data: entry, error: entryErr } = await adminClient.from('entries').insert({
    user_id: userId,
    entry_number: 1,
    entry_name: display_name,
    golfer_1_id,
    golfer_2_id,
    golfer_3_id,
    golfer_4_id,
    total_points_used: total_points_used ?? 0,
    is_locked: true,
  }).select().single()
  if (entryErr) return NextResponse.json({ error: 'Entry failed: ' + entryErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, user_id: userId, entry_id: entry.id })
}
