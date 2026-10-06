import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './admin-auth'
import { headers } from 'next/headers'

export interface ActivityLog {
  id: string
  actor_user_id?: string
  actor_email?: string
  action_type: string
  entity_type: string
  entity_id?: string
  group_id?: string
  expense_id?: string
  metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

export type ActionType =
  | 'login'
  | 'logout'
  | 'expense_created'
  | 'expense_edited'
  | 'expense_deleted'
  | 'group_created'
  | 'group_edited'
  | 'group_deleted'
  | 'member_added'
  | 'member_removed'
  | 'group_joined'
  | 'group_left'
  | 'settlement_created'
  | 'settlement_paid'
  | 'settlement_confirmed'
  | 'settlement_rejected'
  | 'settlement_cancelled'
  | 'payment_request_created'
  | 'payment_request_accepted'
  | 'payment_request_rejected'
  | 'budget_created'
  | 'budget_updated'
  | 'budget_deleted'
  | 'pdf_exported'
  | 'maintenance_enabled'
  | 'maintenance_disabled'
  | 'admin_user_created'
  | 'admin_user_updated'
  | 'admin_user_deleted'

export type EntityType =
  | 'user'
  | 'expense'
  | 'group'
  | 'budget'
  | 'settlement'
  | 'payment_request'
  | 'system'
  | 'admin'

interface LogActivityParams {
  action_type: ActionType
  entity_type: EntityType
  entity_id?: string
  group_id?: string
  expense_id?: string
  metadata?: Record<string, any>
  actor_user_id?: string
}

// Log activity (server-side only)
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = await createClient()
  const headersList = await headers()
  
  // Get user if not provided
  let actorUserId = params.actor_user_id
  if (!actorUserId) {
    const { data: { user } } = await supabase.auth.getUser()
    actorUserId = user?.id
  }

  const logData = {
    actor_user_id: actorUserId,
    action_type: params.action_type,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    group_id: params.group_id,
    expense_id: params.expense_id,
    metadata: params.metadata || {},
    ip_address: headersList.get('x-forwarded-for') || headersList.get('x-real-ip'),
    user_agent: headersList.get('user-agent'),
  }

  const { error } = await supabase
    .from('activity_logs')
    .insert([logData])

  if (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - logging should not break application flow
  }
}

// Get activity logs (admin only)
export async function getActivityLogs(options?: {
  limit?: number
  offset?: number
  actor_user_id?: string
  action_type?: ActionType
  entity_type?: EntityType
  group_id?: string
  from_date?: string
  to_date?: string
}): Promise<{ logs: ActivityLog[]; total: number }> {
  await requireAdmin()
  const supabase = await createClient()

  let query = supabase
    .from('activity_logs')
    .select(`
      *,
      actor:auth.users!activity_logs_actor_user_id_fkey(
        email,
        raw_user_meta_data
      )
    `, { count: 'exact' })

  // Apply filters
  if (options?.actor_user_id) {
    query = query.eq('actor_user_id', options.actor_user_id)
  }
  if (options?.action_type) {
    query = query.eq('action_type', options.action_type)
  }
  if (options?.entity_type) {
    query = query.eq('entity_type', options.entity_type)
  }
  if (options?.group_id) {
    query = query.eq('group_id', options.group_id)
  }
  if (options?.from_date) {
    query = query.gte('created_at', options.from_date)
  }
  if (options?.to_date) {
    query = query.lte('created_at', options.to_date)
  }

  // Order and paginate
  query = query.order('created_at', { ascending: false })
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  if (options?.offset) {
    query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1)
  }

  const { data, error, count } = await query

  if (error) throw error

  return {
    logs: data || [],
    total: count || 0
  }
}

// Get recent activity for dashboard
export async function getRecentActivity(limit = 10): Promise<ActivityLog[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return []

  const { data } = await supabase
    .from('activity_logs')
    .select(`
      *,
      actor:auth.users!activity_logs_actor_user_id_fkey(
        email,
        raw_user_meta_data
      )
    `)
    .or(`actor_user_id.eq.${user.id},group_id.in.(${await getUserGroupIds(user.id)})`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

// Helper to get user's group IDs
async function getUserGroupIds(userId: string): Promise<string> {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  return (data || []).map(g => g.group_id).join(',')
}

// Format action type for display
export function formatActionType(actionType: ActionType): string {
  const actionMap: Record<ActionType, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    expense_created: 'Created expense',
    expense_edited: 'Edited expense',
    expense_deleted: 'Deleted expense',
    group_created: 'Created group',
    group_edited: 'Edited group',
    group_deleted: 'Deleted group',
    member_added: 'Added member',
    member_removed: 'Removed member',
    group_joined: 'Joined group',
    group_left: 'Left group',
    settlement_created: 'Created settlement',
    settlement_paid: 'Marked settlement paid',
    settlement_confirmed: 'Confirmed settlement',
    settlement_rejected: 'Rejected settlement',
    settlement_cancelled: 'Cancelled settlement',
    payment_request_created: 'Created payment request',
    payment_request_accepted: 'Accepted payment request',
    payment_request_rejected: 'Rejected payment request',
    pdf_exported: 'Exported PDF',
    maintenance_enabled: 'Enabled maintenance mode',
    maintenance_disabled: 'Disabled maintenance mode',
    admin_user_created: 'Created admin user',
    admin_user_updated: 'Updated admin user',
    admin_user_deleted: 'Deleted admin user',
  }

  return actionMap[actionType] || actionType
}