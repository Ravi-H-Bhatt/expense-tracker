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
          <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin" />
          <div className="text-slate-600 text-sm">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-600">
            Here's your financial overview
          </p>
        </div>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h2>
                <p className="text-sm text-slate-500">
                  {notifications.length} pending notification{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-slate-50 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 mb-1">
                      {notif.title}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      {notif.message}
                    </p>
                    {notif.amount && (
                      <p className="text-lg font-semibold text-emerald-600">
                        ₹{notif.amount.toLocaleString('en-IN')}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
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

                              toast.success('Settlement confirmed!');
                              fetchDashboardData();
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to confirm settlement');
                            }
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          Confirm
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

                              toast.info('Settlement rejected');
                              fetchDashboardData();
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to reject settlement');
                            }
                          }}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {/* Payment request */}
                    {notif.type === 'payment_request' && (
                      <>
                        <button
                          onClick={() => handlePayNow(notif)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                        >
                          Pay Now
                        </button>
                        <button
                          onClick={() => handleDismissNotification(notif.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                        >
                          Dismiss
                        </button>
                      </>
                    )}

                    {/* Other notifications - just dismiss */}
                    {notif.type !== 'settlement_pending' && notif.type !== 'payment_request' && (
                      <button
                        onClick={() => handleDismissNotification(notif.id)}
                        className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Active Groups</p>
                <p className="text-2xl font-bold text-slate-900">{groups.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Requests</p>
                <p className="text-2xl font-bold text-slate-900">{notifications.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Quick Actions</p>
                <button
                  onClick={() => router.push('/dashboard/splitwise')}
                  className="text-emerald-600 font-medium hover:text-emerald-700 text-sm mt-1"
                >
                  Go to Splitwise →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Section */}
        {groups.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              Your Groups
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => router.push(`/dashboard/splitwise?group=${group.id}`)}
                  className="bg-slate-50 rounded-lg p-4 text-left hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-semibold mb-3">
                    {group.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                  <h3 className="font-medium text-slate-900 mb-1">
                    {group.name}
                  </h3>
                  {group.description && (
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  {group.group_fund > 0 && (
                    <p className="text-sm text-emerald-600 font-medium">
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
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No groups yet
            </h3>
            <p className="text-slate-600 mb-6">
              Create or join a group to start tracking expenses
            </p>
            <button
              onClick={() => router.push('/dashboard/splitwise')}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
            >
              Go to Splitwise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
