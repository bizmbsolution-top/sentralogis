"use client";

import { useState, useEffect } from 'react';
import { useChat } from '@/lib/contexts/ChatContext';
import { supabase } from '@/lib/supabaseClient';
import { X, Users, UserPlus, UserMinus, LogOut, Edit2, Save, Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GroupManagementModalProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function GroupManagementModal({ groupId, groupName, onClose, onUpdate }: GroupManagementModalProps) {
  const { fetchGroupMembers, addGroupMember, removeGroupMember, leaveGroup, updateGroupName, deleteGroup, fetchStaffList } = useChat();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(groupName);

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    setLoading(true);
    const data = await fetchGroupMembers(groupId);
    setMembers(data);
    setLoading(false);
  };

  const handleAddMember = async (userId: string) => {
    try {
      await addGroupMember(groupId, userId);
      toast.success('Member added');
      loadMembers();
      setShowAddMember(false);
    } catch (err) {
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from group?')) return;
    try {
      await removeGroupMember(groupId, userId);
      toast.success('Member removed');
      loadMembers();
    } catch (err) {
      toast.error('Failed to remove member');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Leave this group?')) return;
    try {
      await leaveGroup(groupId);
      toast.success('Left group');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error('Failed to leave group');
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      await updateGroupName(groupId, newName);
      toast.success('Group name updated');
      setEditingName(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update name');
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Delete this group permanently? This cannot be undone.')) return;
    try {
      await deleteGroup(groupId);
      toast.success('Group deleted');
      onUpdate();
      onClose();
    } catch (err) {
      toast.error('Failed to delete group');
    }
  };

  const loadStaffList = async () => {
    const staff = await fetchStaffList();
    const memberIds = members.map(m => m.user_id);
    const filteredStaff = staff.filter(s => !memberIds.includes(s.id));
    setStaffList(filteredStaff);
    setShowAddMember(true);
  };

  const filteredStaff = staffList.filter((s) =>
    s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] flex flex-col bg-[#0f1336] rounded-xl border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white text-lg font-semibold">Group Management</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Group Name */}
          <div>
            <label className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 block">Group Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={handleUpdateName}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => { setEditingName(false); setNewName(groupName); }}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                <span className="text-white text-sm">{groupName}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-white/40 hover:text-white/80 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white/60 text-xs font-semibold uppercase tracking-wider">
                Members ({members.length})
              </label>
              <button
                onClick={loadStaffList}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <UserPlus size={12} />
                Add
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="text-white/40 animate-spin" />
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-semibold">
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white text-xs font-medium">{member.profile?.full_name || 'Unknown'}</p>
                        <p className="text-white/40 text-[10px]">{member.profile?.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === 'admin' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-semibold">
                          ADMIN
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Member Modal */}
          {showAddMember && (
            <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-semibold">Add Members</p>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="text-white/40 hover:text-white/80"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search staff..."
                  className="w-full bg-white/10 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-white text-xs placeholder-white/30 outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredStaff.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleAddMember(staff.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[10px] font-semibold">{staff.full_name?.charAt(0) || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{staff.full_name}</p>
                    </div>
                    <UserPlus size={12} className="text-blue-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleLeaveGroup}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={14} />
              Leave
            </button>
            <button
              onClick={handleDeleteGroup}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600/20 text-red-400 text-xs hover:bg-red-600/30 transition-colors"
            >
              <Trash2 size={14} />
              Delete Group
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
