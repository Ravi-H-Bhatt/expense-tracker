'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ProfileNameEditor from '@/components/ProfileNameEditor';
import { User } from '@supabase/supabase-js';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#475569]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#475569]">Please log in to view your profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-['var(--font-playfair)'] font-bold text-[#0F172A] mb-2">
            Profile Settings
          </h1>
          <p className="text-sm lg:text-base text-[#475569] font-['var(--font-dm-sans)']">
            Manage your account information and preferences
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-8 mb-6">
          <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-6">
            Personal Information
          </h2>

          {/* Profile Name Editor */}
          <div className="mb-6">
            <ProfileNameEditor
              user={user}
              onNameUpdated={(newName) => {
                console.log('Name updated to:', newName);
                fetchUser(); // Refresh user data
              }}
              compact={false}
            />
          </div>

          {/* Email (Read-only) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-[#475569] mb-1">
              Email Address
            </label>
            <div className="px-4 py-3 bg-[#F1F5F9] rounded-lg text-[#0F172A] font-['var(--font-dm-sans)']">
              {user.email}
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>

          {/* User ID (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1">
              User ID
            </label>
            <div className="px-4 py-3 bg-[#F1F5F9] rounded-lg text-[#0F172A] font-['var(--font-dm-sans)'] font-mono text-xs break-all">
              {user.id}
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 lg:p-8">
          <h2 className="text-xl font-['var(--font-playfair)'] font-semibold text-[#0F172A] mb-4">
            Account Information
          </h2>

          <div className="space-y-4 text-sm font-['var(--font-dm-sans)']">
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#475569]">Account Created:</span>
              <span className="text-[#0F172A] font-medium">
                {new Date(user.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#475569]">Last Sign In:</span>
              <span className="text-[#0F172A] font-medium">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : 'Never'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#475569]">Authentication Method:</span>
              <span className="text-[#0F172A] font-medium">
                {user.app_metadata?.provider || 'Email'}
              </span>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900 font-['var(--font-dm-sans)']">
            💡 <strong>Tip:</strong> Your display name will be visible to other group members
            in all shared expenses and balance sheets.
          </p>
        </div>
      </div>
    </div>
  );
}
