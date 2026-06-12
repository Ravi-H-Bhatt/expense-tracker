'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Bell, Users, TrendingUp, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
    const unsubscribe = subscribeToNotifications();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);

      // Fetch notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'unread')
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifs) setNotifications(notifs);

      // Fetch user's groups
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberData && memberData.length > 0) {
        const groupIds = memberData.map(m => m.group_id);
        const { data: groupsData } = await supabase
          .from('split_groups')
          .select('*')
          .in('id', groupIds);

        if (groupsData) setGroups(groupsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    try {
      const channel = supabase
        .channel('dashboard-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        }, () => {
          fetchDashboardData();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to notifications');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      return undefined;
    }
  };

  const handlePayNow = async (notification: any) => {
    try {
      // Navigate to splitwise group
      router.push(`/dashboard/splitwise?group=${notification.group_id}`);
      
      // Mark notification as actioned
      await supabase
        .from('notifications')
        .update({ status: 'actioned', read_at: new Date().toISOString() })
        .eq('id', notification.id);
      
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to process payment');
    }
  };

  const handleDismissNotification = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      fetchDashboardData();
      toast.success('Notification dismissed');
    } catch (error) {
      toast.error('Failed to dismiss notification');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#E2E8F0] border-t-[#047857] rounded-full animate-spin" />
          <div className="text-[#475569] font-['var(--font-dm-sans)']">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-1 sm:p-2 lg:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8 animate-fade-in-up">
          <h1 className="text-2xl lg:text-4xl font-['var(--font-playfair)'] font-bold text-[#0F172A] mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm lg:text-base text-[#475569] font-['var(--font-dm-sans)']">
            Here's your financial overview
          </p>
        </div>

        {/* Payment Requests Section */}
        {notifications.length > 0 && (
          <div className="mb-6 lg:mb-8">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A]">
                    Notifications
                  </h2>
                  <p className="text-sm text-[#475569] font-['var(--font-dm-sans)']">
                    {notifications.length} pending notification{notifications.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-muted rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-scale-in"
                  >
                    <div className="flex-1">
                      <h3 className="font-['var(--font-dm-sans)'] font-semibold text-foreground mb-1">
                        {notif.title}
                      </h3>
                      <p className="text-sm text-muted-foreground font-['var(--font-dm-sans)']">
                        {notif.message}
                      </p>
                      {notif.amount && (
                        <p className="text-lg font-['var(--font-playfair)'] font-bold text-money mt-2">
                          ₹{notif.amount.toLocaleString('en-IN')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(notif.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {/* Settlement pending confirmation */}
                      {notif.type === 'settlement_pending' && notif.metadata?.action === 'confirm_settlement' && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/payments/settle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    payerId: notif.from_user_id,
                                    payeeId: user.id,
                                    amount: notif.amount,
                                    groupId: notif.group_id,
                                    action: 'confirm'
                                  })
                                });

                                const result = await response.json();
                                
                                if (!response.ok) {
                                  throw new Error(result.error || 'Failed to confirm');
                                }

                                await supabase
                                  .from('notifications')
                                  .update({ status: 'actioned', read_at: new Date().toISOString() })
                                  .eq('id', notif.id);

                                toast.success('Settlement confirmed! ✓');
                                fetchDashboardData();
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to confirm settlement');
                              }
                            }}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            ✓ Confirm
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/payments/settle', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    payerId: notif.from_user_id,
                                    payeeId: user.id,
                                    amount: notif.amount,
                                    groupId: notif.group_id,
                                    action: 'reject'
                                  })
                                });

                                const result = await response.json();
                                
                                if (!response.ok) {
                                  throw new Error(result.error || 'Failed to reject');
                                }

                                await supabase
                                  .from('notifications')
                                  .update({ status: 'actioned', read_at: new Date().toISOString() })
                                  .eq('id', notif.id);

                                toast.info('Settlement rejected.');
                                fetchDashboardData();
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to reject settlement');
                              }
                            }}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            ✗ Reject
                          </button>
                        </>
                      )}

                      {/* Payment request */}
                      {notif.type === 'payment_request' && (
                        <>
                          <button
                            onClick={() => handlePayNow(notif)}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Pay Now
                          </button>
                          <button
                            onClick={() => handleDismissNotification(notif.id)}
                            className="flex-1 sm:flex-initial px-4 py-2 border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#F1F5F9] transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            Dismiss
                          </button>
                        </>
                      )}

                      {/* Other notifications - just dismiss */}
                      {notif.type !== 'settlement_pending' && notif.type !== 'payment_request' && (
                        <button
                          onClick={() => handleDismissNotification(notif.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#F1F5F9] transition-colors text-sm font-medium whitespace-nowrap"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8 stagger">
          {/* Total Groups */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#047857] to-[#10B981] rounded-2xl p-6 hover-lift shadow-sm">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/80 font-['var(--font-dm-sans)']">Active Groups</p>
                <p className="text-3xl font-['var(--font-playfair)'] font-bold text-white">
                  {groups.length}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#10B981] to-[#34D399] rounded-2xl p-6 hover-lift shadow-sm">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-white/80 font-['var(--font-dm-sans)']">Pending Requests</p>
                <p className="text-3xl font-['var(--font-playfair)'] font-bold text-white">
                  {notifications.length}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="relative overflow-hidden bg-white border border-[#E2E8F0] rounded-2xl p-6 hover-lift shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#475569] font-['var(--font-dm-sans)']">Quick Actions</p>
                <button
                  onClick={() => router.push('/dashboard/splitwise')}
                  className="text-base text-[#047857] font-semibold hover:underline mt-1"
                >
                  Go to Splitwise →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Your Groups */}
        {groups.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-8 animate-fade-in-up">
            <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-6">
              Your Groups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => router.push(`/dashboard/splitwise?group=${group.id}`)}
                  className="press bg-gradient-to-br from-[#F1F5F9] to-[#ECFDF5] rounded-xl p-5 text-left hover-lift border border-[#E2E8F0]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#047857] text-white flex items-center justify-center font-['var(--font-playfair)'] font-bold mb-3">
                    {group.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                  <h3 className="font-['var(--font-dm-sans)'] font-semibold text-[#0F172A] mb-1">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-[#475569] font-['var(--font-dm-sans)'] mb-2 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  {group.group_fund > 0 && (
                    <p className="text-sm font-['var(--font-dm-sans)'] text-[#047857] font-medium">
                      Fund: ₹{group.group_fund.toLocaleString('en-IN')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {notifications.length === 0 && groups.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-[#047857]" />
            </div>
            <h3 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-2">
              No groups yet
            </h3>
            <p className="text-sm text-[#475569] font-['var(--font-dm-sans)'] mb-6">
              Create or join a group to start tracking expenses
            </p>
            <button
              onClick={() => router.push('/dashboard/splitwise')}
              className="px-6 py-3 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors font-['var(--font-dm-sans)'] font-medium"
            >
              Go to Splitwise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
