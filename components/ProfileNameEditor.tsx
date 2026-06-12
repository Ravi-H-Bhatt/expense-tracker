'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Edit2, Check, X } from 'lucide-react';
import { resolveDisplayName } from '@/lib/display-name';

interface ProfileNameEditorProps {
  user: any;
  onNameUpdated?: (newName: string) => void;
  autoEdit?: boolean;
  compact?: boolean;
}

export default function ProfileNameEditor({
  user,
  onNameUpdated,
  autoEdit = false,
  compact = false
}: ProfileNameEditorProps) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(autoEdit || !user?.profile?.full_name);
  const [saving, setSaving] = useState(false);
  const [originalName, setOriginalName] = useState('');

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const currentName = resolveDisplayName(user, user?.profile);
    setName(currentName);
    setOriginalName(currentName);
  }, [user]);

  const saveName = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    if (name.trim() === originalName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      // Update auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: name.trim()
        }
      });

      if (authError) throw authError;

      // Update profile in database (upsert so a missing row is created)
      if (user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email,
              full_name: name.trim(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          console.warn('Profile upsert warning:', profileError);
        }

        // Sync display name to all group_members records for this user
        console.log('🔄 Syncing display name to all groups...');
        const { error: memberError } = await supabase
          .from('group_members')
          .update({ display_name: name.trim() })
          .eq('user_id', user.id);

        if (memberError) {
          console.error('Error syncing display name to groups:', memberError);
          toast.error('Name updated but failed to sync to groups. Refresh the page.');
        } else {
          console.log('✅ Display name synced to all groups');
        }
      }

      setOriginalName(name.trim());
      setEditing(false);
      toast.success('Name updated successfully across all groups');
      onNameUpdated?.(name.trim());
      // Refresh server components (e.g. the sidebar) so the new name shows everywhere
      router.refresh();
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Failed to save name. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(originalName);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      saveName();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (compact) {
    // Compact inline version
    return (
      <div className="flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="px-2 py-1 border border-[#10B981] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#047857]"
            />
            <button
              onClick={saveName}
              disabled={saving}
              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <span className="text-sm font-medium text-[#0F172A]">{name}</span>
            <button
              onClick={() => setEditing(true)}
              className="p-1 text-[#94A3B8] hover:text-[#047857] hover:bg-[#F1F5F9] rounded opacity-0 group-hover:opacity-100 transition-all"
              title="Edit name"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full page version
  return (
    <div className="space-y-4">
      {!user?.profile?.full_name && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-900 font-medium">
            📝 Add your name so group members can identify you
          </p>
        </div>
      )}

      {editing ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#0F172A]">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-[#10B981] rounded-lg text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#047857] focus:border-transparent"
          />
          <div className="flex gap-3">
            <button
              onClick={saveName}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#047857] text-white rounded-lg hover:bg-[#065F46] transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Name
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-[#10B981] text-[#047857] rounded-lg hover:bg-[#F1F5F9] transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-[#475569] mb-1">Your Name</label>
            <p className="text-lg font-semibold text-[#0F172A]">{name}</p>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 border border-[#10B981] text-[#047857] rounded-lg hover:bg-[#F1F5F9] transition-colors font-medium flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
