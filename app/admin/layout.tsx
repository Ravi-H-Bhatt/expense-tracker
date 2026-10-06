import { requireAdmin } from '@/lib/admin-auth'
import { RFinLogo } from '@/components/ui/rfin-logo'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  try {
    await requireAdmin()
  } catch {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center">
                <RFinLogo size="sm" />
              </Link>
              <nav className="flex items-center gap-6">
                <Link 
                  href="/admin" 
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/activity" 
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Activity Logs
                </Link>
                <Link 
                  href="/admin/settings" 
                  className="text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Settings
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}