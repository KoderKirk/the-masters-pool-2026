import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token || token === 'undefined') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user: caller } } = await anonClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await anonClient.from('profiles').select('is_admin').eq('id', caller.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { user_id, payment_status } = await req.json()
    if (!user_id || !payment_status) {
      return NextResponse.json({ error: 'user_id and payment_status are required' }, { status: 400 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await adminClient.from('profiles').update({ payment_status }).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
