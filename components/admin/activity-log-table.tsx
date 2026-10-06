import { getActivityLogs, formatActionType } from '@/lib/audit-log'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLogTableProps {
  searchParams: {
    page?: string
    actor?: string
    action?: string
    entity?: string
    from?: string
    to?: string
  }
}

export async function ActivityLogTable({ searchParams }: ActivityLogTableProps) {
  const page = parseInt(searchParams.page || '1')
  const limit = 50
  const offset = (page - 1) * limit

  try {
    const { logs, total } = await getActivityLogs({
      limit,
      offset,
      actor_user_id: searchParams.actor || undefined,
      action_type: searchParams.action as any,
      entity_type: searchParams.entity as any,
      from_date: searchParams.from || undefined,
      to_date: searchParams.to || undefined,
    })

    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Entity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="font-medium text-slate-900">
                          {(log as any).actor?.email || 'System'}
                        </div>
                        {log.ip_address && (
                          <div className="text-slate-500 text-xs">
                            {log.ip_address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary">
                        {formatActionType(log.action_type)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      <div>
                        <div className="font-medium">{log.entity_type}</div>
                        {log.entity_id && (
                          <div className="text-slate-500 text-xs font-mono">
                            {log.entity_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="max-w-xs truncate">
                        {Object.keys(log.metadata).length > 0 ? (
                          <pre className="text-xs">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          '-'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div>
                        <div>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No activity logs found
            </div>
          )}

          {/* Simple pagination info */}
          {total > 0 && (
            <div className="px-6 py-3 bg-slate-50 border-t text-sm text-slate-600">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} entries
            </div>
          )}
        </CardContent>
      </Card>
    )
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          Failed to load activity logs
        </CardContent>
      </Card>
    )
  }
}