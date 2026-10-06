import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'super_admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Get current admin user (server-side only)
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  return adminUser
})

// Check if user is admin
export const isAdmin = cache(async (): Promise<boolean> => {
  const adminUser = await getCurrentAdmin()
  return !!adminUser
})

// Check if user is super admin
export const isSuperAdmin = cache(async (): Promise<boolean> => {
  const adminUser = await getCurrentAdmin()
  return adminUser?.role === 'super_admin'
})

// Require admin authentication
export async function requireAdmin(): Promise<AdminUser> {
  const adminUser = await getCurrentAdmin()
  if (!adminUser) {
    redirect('/dashboard')
  }
  return adminUser
}

// Require super admin authentication
export async function requireSuperAdmin(): Promise<AdminUser> {
  const adminUser = await getCurrentAdmin()
  if (!adminUser || adminUser.role !== 'super_admin') {
    redirect('/dashboard')
  }
  return adminUser
}

// Get all admin users (super admin only)
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  await requireSuperAdmin()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Add admin user (super admin only)
export async function addAdminUser(email: string, role: 'admin' | 'super_admin' = 'admin') {
  const currentAdmin = await requireSuperAdmin()
  const supabase = await createClient()

  // Check if user exists in auth.users
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (!existingUser) {
    throw new Error('User must be registered first')
  }

  const { data, error } = await supabase
    .from('admin_users')
    .insert([{
      id: existingUser.id,
      email,
      role,
      created_by: currentAdmin.id
    }])
    .select()
    .single()

  if (error) throw error
  return data
}

// Update admin user (super admin only)
export async function updateAdminUser(id: string, updates: Partial<Pick<AdminUser, 'role' | 'is_active'>>) {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('admin_users')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Remove admin user (super admin only)
export async function removeAdminUser(id: string) {
  await requireSuperAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id)

  if (error) throw error
}