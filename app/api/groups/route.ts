import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/audit-log'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, group_fund, display_name } = body

    // Create group
    const { data: group, error: groupError } = await supabase
      .from('split_groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        group_fund: group_fund ? parseFloat(group_fund) : 0
      })
      .select()
      .single()

    if (groupError) throw groupError

    // Add creator as member
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: display_name
      })

    if (memberError) throw memberError

    // Log activity
    await logActivity({
      action_type: 'group_created',
      entity_type: 'group',
      entity_id: group.id,
      group_id: group.id,
      metadata: {
        group_name: name.trim(),
        description: description?.trim(),
        group_fund: group_fund ? parseFloat(group_fund) : 0
      }
    })

    return NextResponse.json({ success: true, group })
  } catch (error: any) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create group' },
      { status: 500 }
    )
  }
}
