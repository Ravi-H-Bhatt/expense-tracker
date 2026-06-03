'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface JoinGroupModalProps {
  onClose: () => void;
  onGroupJoined: (group: any) => void;
  currentUser: any;
}

export default function JoinGroupModal({ onClose, onGroupJoined, currentUser }: JoinGroupModalProps) {
  const [inviteLink, setInviteLink] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteLink.trim()) {
      toast.error('Please enter an invite link');
      return;
    }

    setIsJoining(true);

    try {
      // Extract token from link
      const token = inviteLink.trim().split('/join/').pop()?.split('?')[0];
      
      if (!token) {
        throw new Error('Invalid invite link format');
      }

      // Find group by token
      const { data: group, error: groupError } = await supabase
        .from('split_groups')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (groupError || !group) {
        throw new Error('Invalid or expired invite link');
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', currentUser.id)
        .single();

      if (existingMember) {
        toast.info('You are already a member of this group');
        onGroupJoined(group);
        return;
      }

      // Add user as member
      const displayName = currentUser.profile?.full_name || currentUser.email?.split('@')[0] || 'User';
      
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: currentUser.id,
          display_name: displayName
        });

      if (memberError) throw memberError;

      onGroupJoined(group);

    } catch (error: any) {
      toast.error(error.message || 'Failed to join group');
      console.error(error);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#FAF7F2] rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DDD0]">
          <h2 className="text-2xl font-['var(--font-playfair)'] font-semibold text-[#1A1208]">
            Join a Group
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B5744] hover:text-[#1A1208] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleJoin} className="px-6 py-6 space-y-5">
          <div>
            <label htmlFor="inviteLink" className="block text-sm font-['var(--font-dm-sans)'] font-semibold text-[#6B5744] mb-2">
              Invite Link
            </label>
            <input
              id="inviteLink"
              type="text"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              placeholder="Paste the invite link here"
              className="w-full border border-[#E8DDD0] rounded-xl px-4 py-3 bg-white placeholder:text-[#A89880] text-[#1A1208] font-['var(--font-dm-sans)'] focus:outline-none focus:ring-2 focus:ring-[#D4956A]"
              required
              disabled={isJoining}
            />
            <p className="text-xs text-[#6B5744] font-['var(--font-dm-sans)'] mt-2">
              Ask a group member for the invite link and paste it above
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isJoining}
              className="flex-1 bg-white border-2 border-[#E8DDD0] text-[#6B5744] rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#F5EFE6] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining || !inviteLink.trim()}
              className="flex-1 bg-[#8B4513] text-white rounded-xl py-3 px-4 font-['var(--font-dm-sans)'] font-semibold hover:bg-[#6B3410] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : 'Join Group →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
