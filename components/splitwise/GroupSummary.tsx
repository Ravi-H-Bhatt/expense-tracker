'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Download, Calendar } from 'lucide-react';
import { SplitwisePDFGenerator } from '@/lib/splitwise-pdf-generator';
import { resolveDisplayName } from '@/lib/display-name';

interface GroupSummaryProps {
  group: any;
  members: any[];
  expenses: any[];
  splits: any[];
  currentUser: any;
  onUpdate: () => void;
  onDeleteExpense?: (expenseId: string) => void;
  balances: Record<string, { paid: number; owes: number; net: number; userId: string }>;
  groupId?: string;
}

export default function GroupSummary({ 
  group, 
  members, 
  expenses, 
  splits, 
  currentUser,
  onUpdate,
  onDeleteExpense,
  balances,
  groupId
}: GroupSummaryProps) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [processingNotif, setProcessingNotif] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRemindingAll, setIsRemindingAll] = useState(false);
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (currentUser?.id) {
      fetchNotifications();
      const unsubscribe = subscribeToNotifications();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [currentUser?.id]);

  const fetchNotifications = async () => {
    if (!currentUser?.id) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('status', 'unread')
      .order('created_at', { ascending: false });
    
    if (data) {
      // Deduplicate notifications by type, group_id, from_user_id, and amount
      // Keep only the most recent one for each unique combination
      const seen = new Set<string>();
      const uniqueNotifications = data.filter((notif) => {
        const key = `${notif.type}-${notif.group_id}-${notif.from_user_id}-${notif.amount}`;
        if (seen.has(key)) {
          // Mark duplicate as read silently
          supabase
            .from('notifications')
            .update({ status: 'read', read_at: new Date().toISOString() })
            .eq('id', notif.id)
            .then();
          return false;
        }
        seen.add(key);
        return true;
      });
      
      setNotifications(uniqueNotifications);
    }
  };

  const subscribeToNotifications = () => {
    if (!currentUser?.id) return undefined;

    try {
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        }, () => {
          fetchNotifications();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const handleSendPaymentRequest = async (memberName: string, amount: number) => {
    try {
      if (!groupId || !currentUser?.id) {
        toast.error('Cannot send request - missing data');
        return;
      }

      const debtor = members.find(m => m.display_name === memberName);
      if (!debtor) {
        toast.error('Member not found');
        return;
      }

      const requesterName = members.find(m => m.user_id === currentUser.id)?.display_name
        || resolveDisplayName(currentUser, currentUser?.profile);

      // Record the payment request + in-app notification (best-effort, must not block email)
      const { error: prError } = await supabase
        .from('payment_requests')
        .insert({
          from_user_id: currentUser.id,
          to_user_id: debtor.user_id,
          amount: amount,
          group_id: groupId,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      if (prError) console.error('payment_requests insert failed:', prError);

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: debtor.user_id,
          type: 'payment_request',
          title: `Payment request from ${requesterName}`,
          message: `${requesterName} is requesting ${formatCurrency(amount)} in ${group.name}`,
          group_id: groupId,
          from_user_id: currentUser.id,
          amount: amount,
          status: 'unread'
        });
      if (notifError) console.error('notification insert failed:', notifError);

      // Send the reminder email — this is the primary action
      const response = await fetch('/api/payments/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          debtorId: debtor.user_id,
          amount: amount,
          groupId: groupId,
          groupName: group.name
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.emailSent) {
        toast.success(`Reminder email sent to ${memberName}`);
      } else {
        // The in-app notification still went through, so tell the truth about email
        toast.warning(
          result.error
            ? `Notified ${memberName} in-app, but email failed: ${result.error}`
            : `Notified ${memberName} in-app, but the email could not be sent.`
        );
      }

      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send payment request');
      console.error(error);
    }
  };

  // Members who owe the current user money (current user is a net creditor for them).
  // A debtor owes the current user only if BOTH: the debtor has a negative net,
  // AND the current user has a positive net (is owed money overall).
  const getDebtorsOwingCurrentUser = () => {
    const currentUserEntry = Object.entries(balances).find(
      ([_, data]: any) => data.userId === currentUser?.id
    );
    // Current user must be owed money overall to chase anyone.
    if (!currentUserEntry || currentUserEntry[1].net <= 0) return [];

    return Object.entries(balances)
      .filter(([name, data]: any) => data.userId !== currentUser?.id && data.net < 0)
      .map(([name, data]: any) => ({ name, amount: Math.abs(data.net), userId: data.userId }));
  };

  const handleRemindAll = async () => {
    if (isRemindingAll) return;

    if (!groupId || !currentUser?.id) {
      toast.error('Cannot send reminders - missing data');
      return;
    }

    const debtors = getDebtorsOwingCurrentUser();
    if (debtors.length === 0) {
      toast.info('No one owes you right now — nothing to remind.');
      return;
    }

    setIsRemindingAll(true);
    const requesterName =
      members.find(m => m.user_id === currentUser.id)?.display_name
      || resolveDisplayName(currentUser, currentUser?.profile);

    let emailed = 0;
    let notified = 0;

    try {
      for (const debtor of debtors) {
        if (!debtor.userId) continue;

        // Best-effort in-app record + notification (must not block email)
        await supabase.from('payment_requests').insert({
          from_user_id: currentUser.id,
          to_user_id: debtor.userId,
          amount: debtor.amount,
          group_id: groupId,
          status: 'pending',
          created_at: new Date().toISOString(),
        });

        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: debtor.userId,
          type: 'payment_request',
          title: `Payment reminder from ${requesterName}`,
          message: `${requesterName} is requesting ${formatCurrency(debtor.amount)} in ${group.name}`,
          group_id: groupId,
          from_user_id: currentUser.id,
          amount: debtor.amount,
          status: 'unread',
        });
        if (!notifError) notified += 1;

        // Reminder email — primary action
        try {
          const response = await fetch('/api/payments/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requesterId: currentUser.id,
              debtorId: debtor.userId,
              amount: debtor.amount,
              groupId: groupId,
              groupName: group.name,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (response.ok && result.emailSent) emailed += 1;
        } catch (err) {
          console.error('Remind-all email failed for', debtor.name, err);
        }
      }

      if (emailed > 0) {
        toast.success(
          `Reminders sent to ${emailed} ${emailed === 1 ? 'person' : 'people'}` +
            (emailed < debtors.length ? ` (${debtors.length - emailed} in-app only)` : '')
        );
      } else if (notified > 0) {
        toast.warning(`Notified ${notified} in-app, but emails could not be sent.`);
      } else {
        toast.error('Could not send reminders. Please try again.');
      }

      onUpdate();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send reminders');
      console.error(error);
    } finally {
      setIsRemindingAll(false);
    }
  };

  const handleSettleUp = async (creditorName: string, creditorUserId: string) => {
    if (isSettling) {
      toast.info('Please wait, processing previous settlement...');
      return;
    }

    try {
      setIsSettling(true);
      
      if (!groupId || !currentUser?.id) {
        toast.error('Cannot settle - missing data');
        return;
      }

      const creditorBalance = balances[creditorName];
      if (!creditorBalance) {
        toast.error('Creditor balance not found');
        return;
      }

      // Current user (debtor) owes money to creditor
      const currentUserBalance = Object.entries(balances).find(
        ([_, data]: any) => data.userId === currentUser.id
      );
      
      if (!currentUserBalance) {
        toast.error('Your balance not found');
        return;
      }

      const amountOwed = Math.abs(currentUserBalance[1].net);
      
      if (amountOwed === 0) {
        toast.info('No outstanding debt to settle');
        return;
      }

      // Call the settlement API to initiate settlement
      const response = await fetch('/api/payments/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payerId: currentUser.id,
          payeeId: creditorUserId,
          amount: amountOwed,
          groupId: groupId,
          action: 'initiate'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate settlement');
      }

      toast.success(`Settlement initiated! ${creditorName} will receive a notification to confirm receipt.`);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to settle');
      console.error(error);
    } finally {
      setIsSettling(false);
    }
  };

  // Calculate chart data - derives from live expenses array
  const chartData = Object.entries(balances).map(([name, data]: [string, any]) => ({
    name,
    value: Math.max(0, data.paid),
  })).filter(item => item.value > 0);

  // Add group fund expenses as a separate slice
  const groupFundExpenses = expenses
    .filter(e => e.is_group_fund_expense)
    .reduce((sum, e) => sum + Number(e.total_amount), 0);

  if (groupFundExpenses > 0) {
    chartData.push({
      name: 'Group Fund',
      value: groupFundExpenses
    });
  }

  const COLORS = ['#047857', '#10B981', '#0EA5E9', '#6366F1', '#14B8A6', '#34D399'];

  const totalGroupFundSpent = expenses
    .filter(e => e.is_group_fund_expense)
    .reduce((sum, e) => sum + Number(e.total_amount), 0);

  // Calculate category breakdown for bar chart
  const categoryMap: Record<string, number> = {};
  expenses.forEach(exp => {
    const desc = exp.description.toLowerCase();
    let category = 'Other';
    
    if (desc.includes('food') || desc.includes('dinner') || desc.includes('lunch') || desc.includes('breakfast')) {
      category = 'Food';
    } else if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi') || desc.includes('cab')) {
      category = 'Transport';
    } else if (desc.includes('shop') || desc.includes('clothes') || desc.includes('shopping')) {
      category = 'Shopping';
    } else if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('fun')) {
      category = 'Entertainment';
    } else if (desc.includes('grocery') || desc.includes('groceries')) {
      category = 'Groceries';
    }
    
    categoryMap[category] = (categoryMap[category] || 0) + Number(exp.total_amount);
  });

  const categoryData = Object.entries(categoryMap).map(([name, value]) => ({
    name,
    value
  }));

  const handleExportReport = () => {
    try {
      const pdfGen = new SplitwisePDFGenerator();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];

      if (reportType === 'monthly') {
        // Filter expenses by selected month and year
        const filteredExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.created_at);
          return expDate.getMonth() === selectedMonth && expDate.getFullYear() === selectedYear;
        });

        if (filteredExpenses.length === 0) {
          toast.error('No expenses found for selected month');
          return;
        }

        const totalSpent = filteredExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

        // Calculate category breakdown
        const categoryMap: Record<string, number> = {};
        filteredExpenses.forEach(exp => {
          const desc = exp.description.toLowerCase();
          let category = 'Other';
          
          if (desc.includes('food') || desc.includes('dinner') || desc.includes('lunch')) {
            category = 'Food';
          } else if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi')) {
            category = 'Transport';
          } else if (desc.includes('shop')) {
            category = 'Shopping';
          } else if (desc.includes('movie') || desc.includes('entertainment')) {
            category = 'Entertainment';
          } else if (desc.includes('grocery')) {
            category = 'Groceries';
          }
          
          categoryMap[category] = (categoryMap[category] || 0) + Number(exp.total_amount);
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
          category,
          amount
        })).sort((a, b) => b.amount - a.amount);

        const memberBalances = Object.entries(balances).map(([name, data]: [string, any]) => ({
          name,
          paid: data.paid,
          owes: data.owes,
          net: data.net
        }));

        pdfGen.generateMonthlyGroupReport({
          groupName: group.name,
          month: monthNames[selectedMonth],
          year: selectedYear.toString(),
          expenses: filteredExpenses,
          members: memberBalances,
          totalSpent,
          groupFund: group.group_fund || 0,
          categoryBreakdown
        });

        pdfGen.save(`${group.name.replace(/[^a-z0-9]/gi, '_')}_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
      } else {
        // Yearly report
        const monthlyData = monthNames.map((month, index) => {
          const monthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.created_at);
            return expDate.getMonth() === index && expDate.getFullYear() === selectedYear;
          });

          return {
            month,
            totalExpenses: monthExpenses.length,
            totalAmount: monthExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0),
            memberCount: members.length
          };
        });

        const yearExpenses = expenses.filter(exp => {
          const expDate = new Date(exp.created_at);
          return expDate.getFullYear() === selectedYear;
        });

        if (yearExpenses.length === 0) {
          toast.error('No expenses found for selected year');
          return;
        }

        const totalAmount = yearExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);

        // Category breakdown for year
        const categoryMap: Record<string, number> = {};
        yearExpenses.forEach(exp => {
          const desc = exp.description.toLowerCase();
          let category = 'Other';
          
          if (desc.includes('food') || desc.includes('dinner') || desc.includes('lunch')) {
            category = 'Food';
          } else if (desc.includes('transport') || desc.includes('uber') || desc.includes('taxi')) {
            category = 'Transport';
          } else if (desc.includes('shop')) {
            category = 'Shopping';
          } else if (desc.includes('movie') || desc.includes('entertainment')) {
            category = 'Entertainment';
          } else if (desc.includes('grocery')) {
            category = 'Groceries';
          }
          
          categoryMap[category] = (categoryMap[category] || 0) + Number(exp.total_amount);
        });

        const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
          category,
          amount
        })).sort((a, b) => b.amount - a.amount);

        const memberBalances = Object.entries(balances).map(([name, data]: [string, any]) => ({
          name,
          paid: data.paid,
          owes: data.owes,
          net: data.net
        }));

        pdfGen.generateYearlyGroupReport({
          groupName: group.name,
          year: selectedYear.toString(),
          monthlyData,
          members: memberBalances,
          totalExpenses: yearExpenses.length,
          totalAmount,
          categoryBreakdown
        });

        pdfGen.save(`${group.name.replace(/[^a-z0-9]/gi, '_')}_Annual_${selectedYear}.pdf`);
      }

      toast.success('Report downloaded successfully!');
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  // Generate month and year options
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="h-full overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6 stagger">
      {/* Export Report Section */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 lg:p-6 hover-lift">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#047857]" />
            <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl">
              Export Monthly Report
            </h3>
          </div>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="press px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-sm font-['var(--font-dm-sans)'] font-medium flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        {showExportMenu && (
          <div className="bg-[#F1F5F9] rounded-xl p-4 space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-sm font-['var(--font-dm-sans)'] font-medium text-[#475569] mb-2">
                Report Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    reportType === 'monthly'
                      ? 'bg-[#047857] text-white'
                      : 'bg-white text-[#047857] border border-[#10B981]'
                  }`}
                >
                  📅 Monthly Report
                </button>
                <button
                  onClick={() => setReportType('yearly')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    reportType === 'yearly'
                      ? 'bg-[#047857] text-white'
                      : 'bg-white text-[#047857] border border-[#10B981]'
                  }`}
                >
                  📊 Yearly Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {reportType === 'monthly' && (
                <div>
                  <label className="block text-sm font-['var(--font-dm-sans)'] font-medium text-[#475569] mb-2">
                    Select Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#10B981] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#047857] font-['var(--font-dm-sans)']"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={reportType === 'yearly' ? 'col-span-2' : ''}>
                <label className="block text-sm font-['var(--font-dm-sans)'] font-medium text-[#475569] mb-2">
                  Select Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-[#10B981] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#047857] font-['var(--font-dm-sans)']"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              {reportType === 'monthly' ? (
                <p>📄 Monthly report includes: member balances, category breakdown, and detailed expense list for {months[selectedMonth]} {selectedYear}</p>
              ) : (
                <p>📊 Yearly report includes: 12-month trend analysis, annual member contributions, category breakdown, and monthly summaries for {selectedYear}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleExportReport}
                className="flex-1 px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-sm font-['var(--font-dm-sans)'] font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Generate {reportType === 'monthly' ? 'Monthly' : 'Yearly'} Report
              </button>
              <button
                onClick={() => setShowExportMenu(false)}
                className="px-4 py-2 border border-[#10B981] text-[#047857] rounded-lg hover:bg-[#F1F5F9] transition-colors text-sm font-['var(--font-dm-sans)'] font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Request Notifications */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 lg:p-6 animate-fade-in-up">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl mb-3 lg:mb-4 flex items-center gap-2">
            <span>🔔</span> Notifications
          </h3>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="bg-white rounded-xl p-4 animate-scale-in hover-lift">
                <div className="flex-1 mb-3">
                  <p className="font-['var(--font-dm-sans)'] font-medium text-[#0F172A] text-sm lg:text-base">
                    {notif.title}
                  </p>
                  <p className="text-xs lg:text-sm text-[#475569] mt-1">
                    {notif.message}
                  </p>
                  {notif.amount && (
                    <p className="text-lg font-['var(--font-playfair)'] font-bold text-[#047857] mt-2">
                      ₹{notif.amount.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                
                {/* Settlement pending confirmation - show confirm/reject buttons */}
                {notif.type === 'settlement_pending' && notif.metadata?.action === 'confirm_settlement' && (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        if (processingNotif === notif.id) return;
                        
                        try {
                          setProcessingNotif(notif.id);
                          
                          // Confirm settlement
                          const response = await fetch('/api/payments/settle', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              payerId: notif.from_user_id,
                              payeeId: currentUser.id,
                              amount: notif.amount,
                              groupId: notif.group_id,
                              action: 'confirm'
                            })
                          });

                          const result = await response.json();
                          
                          if (!response.ok) {
                            throw new Error(result.error || 'Failed to confirm');
                          }

                          // Mark notification as read
                          await supabase
                            .from('notifications')
                            .update({ status: 'actioned', read_at: new Date().toISOString() })
                            .eq('id', notif.id);

                          toast.success('Settlement confirmed! ✓');
                          fetchNotifications();
                          onUpdate();
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to confirm settlement');
                        } finally {
                          setProcessingNotif(null);
                        }
                      }}
                      disabled={processingNotif === notif.id}
                      className="press flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingNotif === notif.id ? 'Processing...' : '✓ Confirm Receipt'}
                    </button>
                    <button
                      onClick={async () => {
                        if (processingNotif === notif.id) return;
                        
                        try {
                          setProcessingNotif(notif.id);
                          
                          // Reject settlement
                          const response = await fetch('/api/payments/settle', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              payerId: notif.from_user_id,
                              payeeId: currentUser.id,
                              amount: notif.amount,
                              groupId: notif.group_id,
                              action: 'reject'
                            })
                          });

                          const result = await response.json();
                          
                          if (!response.ok) {
                            throw new Error(result.error || 'Failed to reject');
                          }

                          // Mark notification as read
                          await supabase
                            .from('notifications')
                            .update({ status: 'actioned', read_at: new Date().toISOString() })
                            .eq('id', notif.id);

                          toast.info('Settlement rejected. Payer notified.');
                          fetchNotifications();
                          onUpdate();
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to reject settlement');
                        } finally {
                          setProcessingNotif(null);
                        }
                      }}
                      disabled={processingNotif === notif.id}
                      className="press flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingNotif === notif.id ? 'Processing...' : '✗ Not Received'}
                    </button>
                  </div>
                )}

                {/* Payment request - show Pay Now button */}
                {notif.type === 'payment_request' && (
                  <button
                    onClick={async () => {
                      // Mark as read
                      await supabase
                        .from('notifications')
                        .update({ status: 'read', read_at: new Date().toISOString() })
                        .eq('id', notif.id);
                      fetchNotifications();
                      
                      toast.info('Navigate to the dashboard to complete payment');
                    }}
                    className="press w-full px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-sm font-medium"
                  >
                    Pay Now
                  </button>
                )}

                {/* Other notification types - show dismiss button */}
                {notif.type !== 'settlement_pending' && notif.type !== 'payment_request' && (
                  <button
                    onClick={async () => {
                      await supabase
                        .from('notifications')
                        .update({ status: 'read', read_at: new Date().toISOString() })
                        .eq('id', notif.id);
                      fetchNotifications();
                      toast.success('Notification dismissed');
                    }}
                    className="press w-full px-4 py-2 border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#F1F5F9] transition-colors text-sm font-medium"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group Fund Box */}
      {group.group_fund > 0 || totalGroupFundSpent > 0 ? (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 lg:p-6 hover-lift">
          <div className="flex items-center gap-2 mb-3 lg:mb-4">
            <span className="text-xl lg:text-2xl">📦</span>
            <h3 className="font-['var(--font-playfair)'] font-semibold text-[#047857] text-lg lg:text-xl">
              Group Fund
            </h3>
          </div>
          <div className="space-y-2 font-['var(--font-dm-sans)'] text-sm lg:text-base">
            <div className="flex justify-between text-[#047857]">
              <span>Total Fund:</span>
              <span className="font-semibold">
                {formatCurrency((group.group_fund || 0) + totalGroupFundSpent)}
              </span>
            </div>
            <div className="flex justify-between text-[#047857]">
              <span>Total Spent:</span>
              <span className="font-semibold">{formatCurrency(totalGroupFundSpent)}</span>
            </div>
            <div className="h-px bg-[#A7F3D0] my-2" />
            <div className="flex justify-between text-[#047857]">
              <span className="font-semibold">Remaining:</span>
              <span className="font-bold text-lg lg:text-xl">
                {formatCurrency(group.group_fund || 0)}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Balance Sheet */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 lg:p-6 hover-lift">
        <div className="flex items-center justify-between mb-3 lg:mb-4 gap-2">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl">
            Balance Sheet
          </h3>
          {getDebtorsOwingCurrentUser().length > 1 && (
            <button
              onClick={handleRemindAll}
              disabled={isRemindingAll}
              className="press inline-flex items-center gap-1.5 px-3 lg:px-4 py-1.5 lg:py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-xs lg:text-sm font-['var(--font-dm-sans)'] font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send a reminder email to everyone who owes you"
            >
              <span>🔔</span>
              {isRemindingAll
                ? 'Reminding...'
                : `Remind All (${getDebtorsOwingCurrentUser().length})`}
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto -mx-4 lg:mx-0">
          <div className="inline-block min-w-full align-middle px-4 lg:px-0">
            <table className="w-full font-['var(--font-dm-sans)']">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#475569]">Member</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#475569]">Paid</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#475569]">Owes</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#475569]">Net</th>
                  <th className="text-right py-2 lg:py-3 px-1 lg:px-2 text-xs lg:text-sm font-semibold text-[#475569]">Action</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(balances).map(([name, data]: [string, any]) => (
                  <tr key={name} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="py-2 lg:py-3 px-1 lg:px-2">
                      <div className="flex items-center gap-1.5 lg:gap-2">
                        <div className="w-6 h-6 lg:w-8 lg:h-8 rounded-full bg-[#047857] text-white flex items-center justify-center text-xs lg:text-sm font-semibold flex-shrink-0">
                          {name[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-[#0F172A] text-xs lg:text-base truncate">{name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2 text-[#0F172A] text-xs lg:text-base whitespace-nowrap">
                      {formatCurrency(data.paid)}
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2 text-[#0F172A] text-xs lg:text-base whitespace-nowrap">
                      {formatCurrency(data.owes)}
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2">
                      <span className={`font-semibold text-xs lg:text-base whitespace-nowrap ${
                        data.net > 0 ? 'text-green-600' : data.net < 0 ? 'text-red-600' : 'text-[#475569]'
                      }`}>
                        {data.net === 0 ? 'Settled' : `${data.net > 0 ? '+' : ''}${formatCurrency(data.net)}`}
                      </span>
                    </td>
                    <td className="text-right py-2 lg:py-3 px-1 lg:px-2">
                      {/* Show buttons based on balance relationship */}
                      {data.net < 0 && (
                        <>
                          {/* This person owes money */}
                          {data.userId === currentUser?.id ? (
                            /* Current user owes - show Pay button */
                            /* Find who current user owes to (person with positive balance) */
                            <>
                              {Object.entries(balances).filter(([_, otherData]: any) => otherData.net > 0).length > 0 && (
                                <button
                                  onClick={() => {
                                    const creditor = Object.entries(balances).find(([_, otherData]: any) => otherData.net > 0);
                                    if (creditor) {
                                      handleSettleUp(creditor[0], creditor[1].userId);
                                    }
                                  }}
                                  disabled={isSettling}
                                  className="press px-2 lg:px-3 py-1 lg:py-1.5 text-xs bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={`Pay ₹${Math.abs(data.net).toLocaleString('en-IN')}`}
                                >
                                  {isSettling ? 'Processing...' : 'Pay'}
                                </button>
                              )}
                            </>
                          ) : (
                            /* Other person owes current user - show Request button */
                            <button
                              onClick={() => handleSendPaymentRequest(name, Math.abs(data.net))}
                              className="press px-2 lg:px-3 py-1 lg:py-1.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium whitespace-nowrap"
                              title={`Request ₹${Math.abs(data.net).toLocaleString('en-IN')} from ${name}`}
                            >
                              Request
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {Object.keys(balances).length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl lg:text-3xl">💰</span>
            </div>
            <p className="text-[#475569] font-['var(--font-dm-sans)'] text-sm lg:text-base">No balance data yet</p>
          </div>
        )}
      </div>

      {/* Pie Chart - Reactive with Empty State */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 lg:p-6 hover-lift">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl">
            Spending by Member
          </h3>
          {chartData.length > 0 && (
            <span className="text-xs lg:text-sm font-['var(--font-dm-sans)'] text-[#94A3B8]">
              Total {formatCurrency(chartData.reduce((s, d) => s + d.value, 0))}
            </span>
          )}
        </div>

        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {COLORS.map((color, i) => (
                    <linearGradient key={i} id={`memberGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={1} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.78} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    (percent || 0) >= 0.06 ? `${((percent || 0) * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={100}
                  innerRadius={62}
                  paddingAngle={3}
                  cornerRadius={6}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={3}
                  isAnimationActive
                  animationDuration={800}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#memberGrad${index % COLORS.length})`} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: '14px',
                    boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom legend with amounts */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {chartData
                .slice()
                .sort((a, b) => b.value - a.value)
                .map((entry) => {
                  const total = chartData.reduce((s, d) => s + d.value, 0) || 1;
                  return (
                    <div key={entry.name} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[chartData.findIndex((d) => d.name === entry.name) % COLORS.length] }}
                      />
                      <span className="text-xs lg:text-sm text-[#475569] font-['var(--font-dm-sans)'] truncate">
                        {entry.name}
                      </span>
                      <span className="text-xs lg:text-sm font-semibold text-[#0F172A] ml-auto whitespace-nowrap">
                        {((entry.value / total) * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 lg:py-16">
            <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-full border-8 border-gray-200 mb-4"></div>
            <p className="text-[#475569] font-['var(--font-dm-sans)'] text-sm lg:text-base">No expenses yet</p>
          </div>
        )}
      </div>

      {/* Bar Chart - Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 lg:p-6 hover-lift">
          <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl mb-3 lg:mb-4">
            Spending by Category
          </h3>

          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData} margin={{ top: 16, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#475569', fontSize: 12 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => (value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`)}
              />
              <Tooltip
                cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: '14px',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
                }}
              />
              <Bar
                dataKey="value"
                fill="url(#barGrad)"
                radius={[10, 10, 0, 0]}
                maxBarSize={64}
                isAnimationActive
                animationDuration={800}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Expenses List with Delete Button */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 lg:p-6 hover-lift">
        <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-lg lg:text-xl mb-3 lg:mb-4">
          Recent Expenses
        </h3>
        
        <div className="space-y-2 lg:space-y-3">
          {expenses.slice(0, 10).map((expense) => (
            <div key={expense.id} className="flex items-center gap-2 lg:gap-3 py-2 lg:py-3 border-b border-[#E2E8F0] last:border-0">
              <div className="text-xl lg:text-2xl">
                {expense.is_group_fund_expense ? '📦' : '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['var(--font-dm-sans)'] font-medium text-[#0F172A] text-sm lg:text-base truncate">
                  {expense.description}
                </p>
                <p className="text-xs text-[#475569] font-['var(--font-dm-sans)'] mt-0.5">
                  {expense.is_group_fund_expense ? (
                    <span className="inline-flex items-center gap-1">
                      <span>Group Fund</span>
                    </span>
                  ) : (
                    `Paid by ${expense.paid_by_name || 'Unknown'}`
                  )}
                  {' · '}
                  {new Date(expense.created_at).toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <p className="font-['var(--font-playfair)'] font-semibold text-[#047857] text-base lg:text-lg whitespace-nowrap">
                {formatCurrency(expense.total_amount)}
              </p>
              {onDeleteExpense && (
                <button
                  onClick={() => {
                    if (confirm('Delete this expense? This will recalculate all balances.')) {
                      onDeleteExpense(expense.id);
                    }
                  }}
                  className="p-1.5 lg:p-2 hover:bg-red-50 rounded-lg transition-colors group flex-shrink-0"
                  title="Delete expense"
                >
                  <Trash2 className="w-4 h-4 text-[#475569] group-hover:text-red-600" />
                </button>
              )}
            </div>
          ))}
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-8 lg:py-12">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl lg:text-3xl">📝</span>
            </div>
            <p className="text-[#475569] font-['var(--font-dm-sans)'] text-sm lg:text-base mb-1">
              No expenses yet
            </p>
            <p className="text-xs lg:text-sm text-[#94A3B8] font-['var(--font-dm-sans)']">
              Start adding expenses in the chat!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
