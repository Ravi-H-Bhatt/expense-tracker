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
  await requireAdmin()

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