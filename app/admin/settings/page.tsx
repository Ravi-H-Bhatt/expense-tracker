import { requireAdmin } from '@/lib/admin-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminSettingsPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600">
          Admin configuration and system information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current RFin system status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <div className="font-medium text-slate-900">Application Status</div>
                <div className="text-sm text-slate-500">System operational status</div>
              </div>
              <div className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                Operational
              </div>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <div className="font-medium text-slate-900">Database</div>
                <div className="text-sm text-slate-500">Database connection status</div>
              </div>
              <div className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                Connected
              </div>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium text-slate-900">Authentication</div>
                <div className="text-sm text-slate-500">User authentication system</div>
              </div>
              <div className="text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                Active
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}