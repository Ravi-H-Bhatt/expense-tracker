import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/audit-log'
import { NextRequest, NextResponse } from 'next/server'
import type { ActionType, EntityType } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action_type, entity_type, entity_id, group_id, expense_id, metadata } = body

    // Log the activity
    await logActivity({
      action_type: action_type as ActionType,
      entity_type: entity_type as EntityType,
      entity_id,
      group_id,
      expense_id,
      metadata: metadata || {}
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error logging activity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to log activity' },
      { status: 500 }
    )
  }
}
