'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function JoinGroupPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const [status, setStatus] = useState<'loading' | 'joining' | 'error'>('loading');
  const [groupName, setGroupName] = useState('');

  const supabase = createClient();

  useEffect(() => {
    handleJoinGroup();
  }, [token]);

  const handleJoinGroup = async () => {
    try {
      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Redirect to login with return URL
        router.push(`/auth/login?returnTo=/join/${token}`);
        return;
      }

      setStatus('joining');

      // Find group by token
      const { data: group, error: groupError } = await supabase
        .from('split_groups')
        .select('*')
        .eq('invite_token', token)
        .single();

      if (groupError || !group) {
        setStatus('error');
        toast.error('Invalid or expired invite link');
        setTimeout(() => router.push('/dashboard/splitwise'), 2000);
        return;
      }

      setGroupName(group.name);

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        toast.success(`Welcome back to ${group.name}!`);
        router.push('/dashboard/splitwise');
        return;
      }

      // Get user profile for display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      // Add user as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          display_name: displayName
        });

      if (memberError) throw memberError;

      toast.success(`You've joined ${group.name}!`);
      
      // Redirect to splitwise page
      setTimeout(() => {
        router.push('/dashboard/splitwise');
      }, 1000);

    } catch (error: any) {
      setStatus('error');
      toast.error('Failed to join group');
      console.error(error);
      setTimeout(() => router.push('/dashboard/splitwise'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm max-w-sm w-full text-center border border-[#E2E8F0]">
        {status === 'loading' || status === 'joining' ? (
          <>
            <div className="w-14 h-14 bg-[#F1F5F9] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg 
                className="w-8 h-8 text-[#047857] animate-spin" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-2">
              {groupName ? `Joining "${groupName}"` : 'Processing...'}
            </h2>
            <p className="text-[#475569] font-['var(--font-dm-sans)']">
              You're being added to this group...
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✗</span>
            </div>
            <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-2">
              Unable to Join
            </h2>
            <p className="text-[#475569] font-['var(--font-dm-sans)']">
              The invite link is invalid or expired
            </p>
          </>
        )}
      </div>
    </div>
  );
}
