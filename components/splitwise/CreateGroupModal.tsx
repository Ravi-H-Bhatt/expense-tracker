'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { X, Copy, Check } from 'lucide-react';

interface CreateGroupModalProps {
  onClose: () => void;
  onGroupCreated: (group: any) => void;
  currentUser: any;
}

export default function CreateGroupModal({ onClose, onGroupCreated, currentUser }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupFund, setGroupFund] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<any>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    setIsCreating(true);

    try {
      // Create group
      const { data: group, error: groupError } = await supabase
        .from('split_groups')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          created_by: currentUser.id,
          group_fund: groupFund ? parseFloat(groupFund) : 0
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as member
      const displayName = currentUser.profile?.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
      
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: currentUser.id,
          display_name: displayName
        });

      if (memberError) throw memberError;

      setCreatedGroup(group);
      // Don't close modal yet - show invite link

    } catch (error: any) {
      toast.error('Failed to create group');
      console.error(error);
      setIsCreating(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${createdGroup.invite_token}`;
    navigator.clipboard.writeText(link);
    setInviteLinkCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setInviteLinkCopied(false), 2000);
  };

  const handleDone = () => {
    onGroupCreated(createdGroup);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#F8FAFC] rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-2xl font-['var(--font-playfair)'] font-semibold text-[#0F172A]">
            {createdGroup ? 'Group Created!' : 'Create a Group'}
          </h2>
          <button
            onClick={createdGroup ? handleDone : onClose}
            className="text-[#475569] hover:text-[#0F172A] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        {createdGroup ? (
          <div className="px-6 py-6">
            <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] mb-4">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-['var(--font-playfair)'] font-semibold text-[#0F172A] text-xl mb-1">
                  {createdGroup.name}
                </h3>
                {createdGroup.description && (
                  <p className="text-sm text-[#475569] font-['var(--font-dm-sans)']">
                    {createdGroup.description}
                  </p>
                )}
              </div>

              <div className="bg-[#ECFDF5] rounded-lg p-4">
                <p className="text-sm font-['var(--font-dm-sans)'] text-[#047857] font-semibold mb-2">
                  Invite Link
                </p>
                <code className="text-xs bg-white px-3 py-2 rounded border border-[#E2E8F0] text-[#0F172A] font-mono block mb-3 break-all">
                  {`${window.location.origin}/join/${createdGroup.invite_token}`}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="w-full px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors text-sm font-['var(--font-dm-sans)'] font-medium flex items-center justify-center gap-2"
                >
                  {inviteLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {inviteLinkCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <p className="text-sm text-[#475569] font-['var(--font-dm-sans)'] text-center mb-4">
              Share this link with anyone you want to add to the group. They'll join automatically when they open it.
            </p>

            <button
              onClick={handleDone}
              className="w-full bg-[#047857] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#065F46] transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="px-6 py-6 space-y-5">
            {/* Group Name */}
            <div>
              <label htmlFor="groupName" className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#475569] mb-2">
                Group Name *
              </label>
              <input
                id="groupName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Trip to Goa, Roommates, Office Lunch"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white placeholder:text-[#94A3B8] text-[#0F172A] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                required
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#475569] mb-2">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white placeholder:text-[#94A3B8] text-[#0F172A] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                disabled={isCreating}
              />
            </div>

            {/* Group Fund */}
            <div>
              <label htmlFor="groupFund" className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#475569] mb-2">
                Group Fund (₹)
              </label>
              <input
                id="groupFund"
                type="number"
                value={groupFund}
                onChange={(e) => setGroupFund(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 bg-white placeholder:text-[#94A3B8] text-[#0F172A] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                disabled={isCreating}
              />
              <p className="text-xs text-[#475569] font-['var(--font-dm-sans)'] mt-2">
                Only enter this if everyone has already contributed money into a common pool. This won't split it automatically.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="flex-1 bg-white border-2 border-[#E2E8F0] text-[#475569] rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#F1F5F9] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="flex-1 bg-[#047857] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#065F46] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Group →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
