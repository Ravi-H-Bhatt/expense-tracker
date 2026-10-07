'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Receipt, 
  PieChart, 
  Target, 
  Bot, 
  Users,
  Settings, 
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { resolveDisplayName, getInitials } from '@/lib/display-name';
import { RFinLogo } from '@/components/ui/rfin-logo';

interface DashboardNavProps {
  user: any;
  profile: any;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Analytics', href: '/dashboard/analytics', icon: PieChart },
  { name: 'Budgets', href: '/dashboard/budgets', icon: Target },
  { name: 'AI Assistant', href: '/dashboard/ai-assistant', icon: Bot },
  { name: 'Splitwise', href: '/dashboard/splitwise', icon: Users },
  { name: 'Profile', href: '/dashboard/profile', icon: Settings },
];

export default function DashboardNav({ user, profile }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      console.log('❌ No user logged in');
      return;
    }
    
    console.log('🔍 Checking admin status for user:', user.id, user.email);
    
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();
    
    console.log('📊 Admin check result:', { data, error });
    
    if (data) {
      console.log('✅ User IS admin:', data.role);
      setIsAdmin(true);
    } else {
      console.log('❌ User is NOT admin');
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const displayName = resolveDisplayName(user, profile);

  const initials = getInitials(displayName, user?.email);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <RFinLogo size="sm" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200 transition-transform duration-300',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <Link href="/dashboard" className="flex items-center">
              <RFinLogo />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      "w-full justify-start font-medium",
                      isActive 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                        : "hover:bg-slate-100 text-slate-700"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}

            {/* Admin Panel Button - Only for admins */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <div className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Admin
                  </div>
                </div>
                <Link href="/admin">
                  <Button
                    variant={pathname.startsWith('/admin') ? 'default' : 'ghost'}
                    className={cn(
                      "w-full justify-start font-medium",
                      pathname.startsWith('/admin')
                        ? "bg-orange-600 hover:bg-orange-700 text-white" 
                        : "hover:bg-orange-50 text-orange-600"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Shield className="w-5 h-5 mr-3" />
                    Admin Panel
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-200 space-y-2">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar>
                <AvatarFallback className="bg-emerald-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile spacing */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
