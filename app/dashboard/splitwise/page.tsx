'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import GroupList from '@/components/splitwise/GroupList';
import GroupWorkspace from '@/components/splitwise/GroupWorkspace';
import CreateGroupModal from '@/components/splitwise/CreateGroupModal';
import JoinGroupModal from '@/components/splitwise/JoinGroupModal';

export default function SplitwisePage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchUser();
    fetchGroups();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get groups where user is a member
      const { data: memberData, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          split_groups (
            id,
            name,
            description,
            group_fund,
            created_by,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const groupsList = memberData?.map(m => m.split_groups).filter(Boolean) || [];
      setGroups(groupsList);
    } catch (error: any) {
      toast.error('Failed to load groups');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupCreated = (newGroup: any) => {
    setGroups(prev => [newGroup, ...prev]);
    setSelectedGroupId(newGroup.id);
    setShowCreateModal(false);
    toast.success('Group created!');
  };

  const handleGroupJoined = (group: any) => {
    setGroups(prev => [group, ...prev]);
    setSelectedGroupId(group.id);
    setShowJoinModal(false);
    toast.success(`Joined ${group.name}!`);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col lg:flex-row lg:rounded-2xl overflow-hidden lg:border border-border bg-card">
      {/* Left Panel - Group List (Mobile: Collapsible, Desktop: Fixed) */}
      <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-[#F5EFE6] flex flex-col lg:h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="p-3 lg:p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2 lg:mb-3">
            <h2 className="text-lg lg:text-xl font-['var(--font-playfair)'] font-semibold text-[#1A1208]">
              Groups
            </h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-2.5 lg:px-3 py-1.5 bg-[#8B4513] text-white text-xs lg:text-sm rounded-lg hover:bg-[#6B3410] transition-colors font-['var(--font-dm-sans)']"
            >
              ＋ New
            </button>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full px-3 py-2 border border-[#8B4513] text-[#8B4513] text-xs lg:text-sm rounded-lg hover:bg-[#8B4513] hover:text-white transition-colors font-['var(--font-dm-sans)']"
          >
            Join via link
          </button>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-[#6B5744] text-sm">Loading groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-4 lg:p-6 text-center text-[#6B5744]">
              <p className="mb-2 font-['var(--font-dm-sans)'] text-sm">No groups yet.</p>
              <p className="text-xs">Create one or join via invite link.</p>
            </div>
          ) : (
            <GroupList
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          )}
        </div>
      </div>

      {/* Right Panel - Group Workspace */}
      <div className="flex-1 bg-[#FAF7F2] lg:h-[calc(100vh-8rem)]">
        {selectedGroupId ? (
          <GroupWorkspace 
            groupId={selectedGroupId} 
            currentUser={currentUser}
            onGroupDeleted={() => {
              setGroups(prev => prev.filter(g => g.id !== selectedGroupId));
              setSelectedGroupId(null);
            }}
          />
        ) : (
          <div className="h-64 lg:h-full flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-full bg-[#F5EFE6] flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="1.5" className="lg:w-12 lg:h-12">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-lg lg:text-xl font-['var(--font-playfair)'] font-semibold text-[#1A1208] mb-1 lg:mb-2">
                Select a group to start
              </h3>
              <p className="text-[#6B5744] font-['var(--font-dm-sans)'] text-sm">
                Choose a group from above or create a new one
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onGroupCreated={handleGroupCreated}
          currentUser={currentUser}
        />
      )}

      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onGroupJoined={handleGroupJoined}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
