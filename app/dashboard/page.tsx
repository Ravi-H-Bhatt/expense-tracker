import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
            <p className="text-gray-600 mt-1">Welcome, {user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            🎉 Authentication is working!
          </h2>
          <p className="text-gray-600 mb-4">
            You're now logged in and this page is protected. Only authenticated users can see this.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-blue-900 mb-2">Next Steps:</h3>
            <ul className="list-disc list-inside text-blue-800 space-y-2">
              <li>Create expense tracking forms</li>
              <li>Set up database tables for expenses</li>
              <li>Add charts and analytics</li>
              <li>Build category management</li>
              <li>Add budget tracking features</li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>User ID:</strong> {user.id}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
