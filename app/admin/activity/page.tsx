import { requireAdmin } from '@/lib/admin-auth'
import { ActivityLogTable } from '@/components/admin/activity-log-table'
import { ActivityFilters } from '@/components/admin/activity-filters'

interface PageProps {
  searchParams: {
    page?: string
    actor?: string
    action?: string
    entity?: string
    from?: string
    to?: string
  }
}

export default async function ActivityLogPage({ searchParams }: PageProps) {
  try {
    await requireAdmin()
  } catch (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Access Denied</h2>
          <p className="text-red-600">You need admin privileges to view activity logs.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
        <p className="text-slate-600">
          Track all system activities and user actions
        </p>
      </div>

      <ActivityFilters />
      <ActivityLogTable searchParams={searchParams} />
    </div>
  )
}