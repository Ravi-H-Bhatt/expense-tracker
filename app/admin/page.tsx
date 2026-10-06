import { requireAdmin, getCurrentAdmin } from '@/lib/admin-auth'
import { StatsCards } from '@/components/admin/stats-cards'
import { RecentActivityCard } from '@/components/admin/recent-activity-card'

export default async function AdminDashboard() {
  const admin = await requireAdmin()
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Admin Dashboard
          </h1>
          <p className="text-slate-600">
            Welcome back, {admin.email}
          </p>
        </div>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Recent Activity */}
      <RecentActivityCard />
    </div>
  )
}