import { getActivityLogs, formatActionType } from '@/lib/audit-log'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export async function RecentActivityCard() {
  try {
    const { logs } = await getActivityLogs({ limit: 10 })

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Link 
            href="/admin/activity"
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-6 text-slate-500">
              No recent activity
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {formatActionType(log.action_type)}
                      </Badge>
                      {log.actor_user_id && (
                        <span className="text-sm text-slate-600">
                          by {(log as any).actor?.email || 'Unknown'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-900">
                      {log.entity_type} {log.entity_id && `(${log.entity_id.slice(0, 8)}...)`}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Failed to fetch recent activity:', error)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-slate-500">
            Failed to load activity
          </div>
        </CardContent>
      </Card>
    )
  }
}