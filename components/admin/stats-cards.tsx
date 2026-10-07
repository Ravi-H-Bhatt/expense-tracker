import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, Activity, Shield } from 'lucide-react'

export async function StatsCards() {
  const supabase = await createClient()

  // Get stats - count from auth.users for total users
  const [
    { count: totalUsers },
    { count: totalExpenses },
    { count: activeGroups },
    { count: adminUsers }
  ] = await Promise.all([
    supabase.auth.admin.listUsers().then(res => ({ count: res.data.users?.length || 0 })),
    supabase.from('group_expenses').select('*', { count: 'exact', head: true }),
    supabase.from('split_groups').select('*', { count: 'exact', head: true }),
    supabase.from('admin_users').select('*', { count: 'exact', head: true }).eq('is_active', true)
  ])

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers?.toString() || '0',
      icon: Users,
      description: 'Registered users'
    },
    {
      title: 'Total Expenses',
      value: totalExpenses?.toString() || '0',
      icon: DollarSign,
      description: 'All time expenses'
    },
    {
      title: 'Active Groups',
      value: activeGroups?.toString() || '0',
      icon: Activity,
      description: 'Currently active'
    },
    {
      title: 'Admin Users',
      value: adminUsers?.toString() || '0',
      icon: Shield,
      description: 'Active admins'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stat.value}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}