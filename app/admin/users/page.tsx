import { requireAdmin } from '@/lib/admin-auth'
import { UsersTable } from '@/components/admin/users-table'

export default async function AdminUsersPage() {
  await requireAdmin()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600">
          All registered users in the system
        </p>
      </div>

      <UsersTable />
    </div>
  )
}
