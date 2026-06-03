'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { X, Trash2 } from 'lucide-react';

interface ManualExpenseModalProps {
  onClose: () => void;
  onExpenseAdded: () => void;
  groupId: string;
  members: any[];
  currentUser: any;
  group: any;
  existingExpense?: any; // For editing
}

export default function ManualExpenseModal({
  onClose,
  onExpenseAdded,
  groupId,
  members,
  currentUser,
  group,
  existingExpense
}: ManualExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'manual' | 'groupfund'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [manualSplits, setManualSplits] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (existingExpense) {
      // Editing mode
      setDescription(existingExpense.description);
      setTotalAmount(existingExpense.total_amount.toString());
      setPaidBy(existingExpense.paid_by_name || '');
      setSplitType(existingExpense.is_group_fund_expense ? 'groupfund' : 'equal');
    } else {
      // Default payer is current user
      const currentMember = members.find(m => m.user_id === currentUser?.id);
      if (currentMember) {
        setPaidBy(currentMember.display_name);
      }
    }
  }, [existingExpense, members, currentUser]);

  const handleMemberToggle = (memberName: string) => {
    setSelectedMembers(prev => {
      if (prev.includes(memberName)) {
        return prev.filter(m => m !== memberName);
      } else {
        return [...prev, memberName];
      }
    });
  };

  const handleManualSplitChange = (memberName: string, amount: string) => {
    setManualSplits(prev => ({
      ...prev,
      [memberName]: amount
    }));
  };

  const calculateSplits = () => {
    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) return [];

    if (splitType === 'groupfund') {
      return [];
    }

    if (splitType === 'equal') {
      const membersToSplit = selectedMembers.length > 0 ? selectedMembers : members.map(m => m.display_name);
      const splitAmount = amount / membersToSplit.length;
      return membersToSplit.map(name => ({
        name,
        amount: splitAmount
      }));
    }

    // Manual splits
    return Object.entries(manualSplits)
      .filter(([_, amt]) => parseFloat(amt) > 0)
      .map(([name, amt]) => ({
        name,
        amount: parseFloat(amt)
      }));
  };

  const validateSplits = () => {
    if (splitType === 'groupfund') return true;

    const splits = calculateSplits();
    if (splits.length === 0) {
      toast.error('Please select at least one member to split with');
      return false;
    }

    if (splitType === 'manual') {
      const totalSplit = splits.reduce((sum, s) => sum + s.amount, 0);
      const amount = parseFloat(totalAmount);
      if (Math.abs(totalSplit - amount) > 0.01) {
        toast.error(`Splits must add up to ₹${amount}. Currently: ₹${totalSplit.toFixed(2)}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    const amount = parseFloat(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (splitType !== 'groupfund' && !paidBy) {
      toast.error('Please select who paid');
      return;
    }

    if (!validateSplits()) return;

    setIsSaving(true);

    try {
      if (existingExpense) {
        // Update existing expense
        const { error: updateError } = await supabase
          .from('group_expenses')
          .update({
            description: description.trim(),
            total_amount: amount,
            is_group_fund_expense: splitType === 'groupfund',
            paid_by_name: splitType === 'groupfund' ? null : paidBy
          })
          .eq('id', existingExpense.id);

        if (updateError) throw updateError;

        // Delete old splits
        const { error: deleteError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', existingExpense.id);

        if (deleteError) throw deleteError;

        // Insert new splits
        if (splitType !== 'groupfund') {
          const splits = calculateSplits();
          const splitsToInsert = splits.map(split => {
            const member = members.find(m => m.display_name === split.name);
            return {
              expense_id: existingExpense.id,
              user_id: member?.user_id || null,
              display_name: split.name,
              amount_owed: split.amount,
              is_settled: false
            };
          });

          const { error: splitsError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitsError) throw splitsError;
        }

        toast.success('Expense updated!');
      } else {
        // Create new expense
        const { data: expenseData, error: expenseError } = await supabase
          .from('group_expenses')
          .insert({
            group_id: groupId,
            added_by: currentUser.id,
            description: description.trim(),
            total_amount: amount,
            is_group_fund_expense: splitType === 'groupfund',
            paid_by_name: splitType === 'groupfund' ? null : paidBy
          })
          .select()
          .single();

        if (expenseError) throw expenseError;

        // Insert splits if not group fund expense
        if (splitType !== 'groupfund') {
          const splits = calculateSplits();
          const splitsToInsert = splits.map(split => {
            const member = members.find(m => m.display_name === split.name);
            return {
              expense_id: expenseData.id,
              user_id: member?.user_id || null,
              display_name: split.name,
              amount_owed: split.amount,
              is_settled: false
            };
          });

          const { error: splitsError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitsError) throw splitsError;
        }

        // Update group fund if group fund expense
        if (splitType === 'groupfund') {
          const newFund = Math.max(0, (group.group_fund || 0) - amount);
          const { error: fundError } = await supabase
            .from('split_groups')
            .update({ group_fund: newFund })
            .eq('id', groupId);

          if (fundError) throw fundError;
        }

        toast.success('Expense added!');
      }

      onExpenseAdded();
      onClose();
    } catch (error: any) {
      toast.error(existingExpense ? 'Failed to update expense' : 'Failed to add expense');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingExpense) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('group_expenses')
        .delete()
        .eq('id', existingExpense.id);

      if (error) throw error;

      toast.success('Expense deleted!');
      onExpenseAdded();
      onClose();
    } catch (error: any) {
      toast.error('Failed to delete expense');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const splits = calculateSplits();
  const manualSplitsTotal = Object.values(manualSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-2xl max-w-2xl w-full shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-[#E8DDD0] sticky top-0 bg-[#FAF7F2] z-10">
          <h2 className="text-xl lg:text-2xl font-['var(--font-playfair)'] font-semibold text-[#1A1208]">
            {existingExpense ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <div className="flex items-center gap-2">
            {existingExpense && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete expense"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[#6B5744] hover:text-[#1A1208] transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-4 lg:px-6 py-6 space-y-5">
          {/* Description */}
          <div>
            <label className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
              Description *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at restaurant"
              className="w-full border border-[#E8DDD0] rounded-xl px-4 py-3 bg-white placeholder:text-[#A89880] text-[#1A1208] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#D4956A]"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
              Total Amount (₹) *
            </label>
            <input
              type="number"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="w-full border border-[#E8DDD0] rounded-xl px-4 py-3 bg-white placeholder:text-[#A89880] text-[#1A1208] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#D4956A]"
              required
            />
          </div>

          {/* Split Type */}
          <div>
            <label className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
              Split Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSplitType('equal')}
                className={`px-4 py-3 rounded-xl font-['var(--font-dm-sans)'] font-medium transition-all ${
                  splitType === 'equal'
                    ? 'bg-[#8B4513] text-white'
                    : 'bg-white border border-[#E8DDD0] text-[#6B5744] hover:border-[#8B4513]'
                }`}
              >
                Split Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitType('manual')}
                className={`px-4 py-3 rounded-xl font-['var(--font-dm-sans)'] font-medium transition-all ${
                  splitType === 'manual'
                    ? 'bg-[#8B4513] text-white'
                    : 'bg-white border border-[#E8DDD0] text-[#6B5744] hover:border-[#8B4513]'
                }`}
              >
                Custom Split
              </button>
              <button
                type="button"
                onClick={() => setSplitType('groupfund')}
                className={`px-4 py-3 rounded-xl font-['var(--font-dm-sans)'] font-medium transition-all ${
                  splitType === 'groupfund'
                    ? 'bg-[#8B4513] text-white'
                    : 'bg-white border border-[#E8DDD0] text-[#6B5744] hover:border-[#8B4513]'
                }`}
              >
                📦 Group Fund
              </button>
            </div>
          </div>

          {/* Paid By (if not group fund) */}
          {splitType !== 'groupfund' && (
            <div>
              <label className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
                Paid By *
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full border border-[#E8DDD0] rounded-xl px-4 py-3 bg-white text-[#1A1208] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#D4956A]"
                required
              >
                <option value="">Select who paid</option>
                {members.map((member) => (
                  <option key={member.id} value={member.display_name}>
                    {member.display_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Member Selection & Splits */}
          {splitType !== 'groupfund' && (
            <div>
              <label className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
                {splitType === 'equal' ? 'Split With (select members)' : 'Enter Custom Amounts'}
              </label>
              <div className="bg-white rounded-xl border border-[#E8DDD0] p-4 space-y-3 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitType === 'equal' ? selectedMembers.includes(member.display_name) : true}
                        onChange={() => splitType === 'equal' && handleMemberToggle(member.display_name)}
                        disabled={splitType === 'manual'}
                        className="w-5 h-5 rounded border-[#E8DDD0] text-[#8B4513] focus:ring-[#D4956A]"
                      />
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#8B4513] text-white flex items-center justify-center text-sm font-semibold">
                          {member.display_name[0].toUpperCase()}
                        </div>
                        <span className="font-['var(--font-dm-sans)'] text-[#1A1208]">
                          {member.display_name}
                        </span>
                      </div>
                    </label>
                    
                    {splitType === 'manual' ? (
                      <input
                        type="number"
                        value={manualSplits[member.display_name] || ''}
                        onChange={(e) => handleManualSplitChange(member.display_name, e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-24 border border-[#E8DDD0] rounded-lg px-3 py-2 text-right text-[#1A1208] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#D4956A]"
                      />
                    ) : (
                      <span className="text-sm text-[#6B5744] font-['var(--font-dm-sans)'] w-24 text-right">
                        {selectedMembers.includes(member.display_name) || (selectedMembers.length === 0 && parseFloat(totalAmount) > 0)
                          ? `₹${(parseFloat(totalAmount) / (selectedMembers.length || members.length)).toFixed(2)}`
                          : '—'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {splitType === 'manual' && totalAmount && (
                <div className="mt-2 flex justify-between text-sm font-['var(--font-dm-sans)']">
                  <span className="text-[#6B5744]">Total split:</span>
                  <span className={`font-semibold ${
                    Math.abs(manualSplitsTotal - parseFloat(totalAmount)) < 0.01
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    ₹{manualSplitsTotal.toFixed(2)} / ₹{totalAmount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Group Fund Warning */}
          {splitType === 'groupfund' && (
            <div className="bg-[#FFF3CD] border border-[#F0C040] rounded-xl p-4">
              <p className="text-sm font-['var(--font-dm-sans)'] text-[#8B4513]">
                This expense will be deducted from the group fund (Current: ₹{group.group_fund || 0})
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              className="flex-1 bg-white border-2 border-[#E8DDD0] text-[#6B5744] rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#F5EFE6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || isDeleting}
              className="flex-1 bg-[#8B4513] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#6B3410] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : existingExpense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
