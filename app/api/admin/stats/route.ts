import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user count from auth
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching users:', authError)
    }

    // Get other stats
    const [
      { count: totalExpenses },
      { count: activeGroups },
      { count: adminUsers }
    ] = await Promise.all([
      supabase.from('group_expenses').select('*', { count: 'exact', head: true }),
      supabase.from('split_groups').select('*', { count: 'exact', head: true }),
      supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ])

    return NextResponse.json({
      totalUsers: authUsers?.users?.length || 0,
      totalExpenses: totalExpenses || 0,
      activeGroups: activeGroups || 0,
      adminUsers: adminUsers || 0
    })
  } catch (error: any) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get stats' },
      { status: 500 }
    )
  }
}
