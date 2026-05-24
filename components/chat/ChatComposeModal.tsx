"use client";

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@/lib/contexts/ChatContext';
import { supabase } from '@/lib/supabaseClient';
import {
  Users, User, Search, X, Plus, Loader2, ArrowLeft, Check, Truck, Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ChatComposeModalProps {
  onClose: () => void;
  onChatOpen: (channelId: string) => void;
  tenantId?: string;
  userId?: string;
}

export default function ChatComposeModal({ onClose, onChatOpen, tenantId, userId }: ChatComposeModalProps) {
  const { createGroup, fetchStaffList, getOrCreateDirectChat } = useChat();
  const [mode, setMode] = useState<'select' | 'new-group' | 'new-direct'>('select');
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [existingGroups, setExistingGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchGroups();
    }
  }, [tenantId]);

  const fetchGroups = useCallback(async () => {
    if (!tenantId) return;
    setLoadingGroups(true);
    try {
      const { data, error } = await supabase
        .from('chat_groups')
        .select(`id, name, group_type, description, chat_group_members(count)`)
        .eq('tenant_id', tenantId)
        .order('group_type', { ascending: true })
        .order('name', { ascending: true });

      if (!error && data) {
        setExistingGroups(data.map((g: any) => ({
          ...g,
          member_count: g.chat_group_members?.[0]?.count || 0,
        })));
      }
    } catch (err) {
      console.error('[Compose] Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, [tenantId]);

  const loadStaff = useCallback(async () => {
    const staff = await fetchStaffList();
    setStaffList(staff);
  }, [fetchStaffList]);

  const filteredStaff = staffList.filter((s) =>
    s.full_name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.role?.toLowerCase().includes(staffSearch.toLowerCase())
  );

  const handleOpenExistingGroup = async (groupId: string) => {
    const { data } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('channel_type', 'group')
      .eq('channel_id', groupId)
      .maybeSingle();

    if (data) {
      onChatOpen(data.id);
    }
  };

  const handleStartDirect = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    const channel = await getOrCreateDirectChat(selectedStaff);
    setLoading(false);
    if (channel) onChatOpen(channel.id);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;
    setLoading(true);
    const members = [userId, ...selectedMembers.filter(id => id !== userId)];
    const channel = await createGroup(groupName.trim(), groupDesc.trim(), members);
    setLoading(false);
    if (channel) onChatOpen(channel.id);
  };

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'sbu': return <Truck size={16} />;
      case 'role': return <Briefcase size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getGroupColor = (type: string) => {
    switch (type) {
      case 'sbu': return 'from-blue-400 to-blue-600';
      case 'role': return 'from-purple-400 to-purple-600';
      default: return 'from-emerald-400 to-teal-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600">
          {mode !== 'select' && (
            <button onClick={() => setMode('select')} className="w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center">
              <ArrowLeft size={18} className="text-white" />
            </button>
          )}
          <h2 className="text-white text-base font-semibold flex-1">
            {mode === 'select' ? 'New Chat' : mode === 'new-group' ? 'New Group' : 'New Direct Chat'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center">
            <X size={18} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          {/* SELECT MODE */}
          {mode === 'select' && (
            <div className="p-4 space-y-3">
              {/* Existing Groups */}
              <div>
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Groups</h3>
                {loadingGroups ? (
                  <div className="flex justify-center py-4"><Loader2 size={20} className="text-gray-300 animate-spin" /></div>
                ) : existingGroups.length > 0 ? (
                  <div className="space-y-1">
                    {existingGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => handleOpenExistingGroup(g.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getGroupColor(g.group_type)} flex items-center justify-center flex-shrink-0`}>
                          {getGroupIcon(g.group_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium truncate">{g.name}</p>
                          <p className="text-gray-400 text-xs">{g.member_count} members</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-xs text-center py-4">No groups yet</p>
                )}
              </div>

              {/* Create New Group */}
              <button
                onClick={() => { setMode('new-group'); loadStaff(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Plus size={18} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-900 text-sm font-medium">New Group</p>
                  <p className="text-gray-400 text-xs">Create a group with multiple people</p>
                </div>
              </button>

              {/* New Direct Chat */}
              <button
                onClick={() => { setMode('new-direct'); loadStaff(); }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="text-gray-900 text-sm font-medium">New Direct Chat</p>
                  <p className="text-gray-400 text-xs">Chat with someone in your tenant</p>
                </div>
              </button>
            </div>
          )}

          {/* NEW GROUP MODE */}
          {mode === 'new-group' && (
            <div className="p-4 space-y-4">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <textarea
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
              />
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-2">
                  Add members ({selectedMembers.length} selected)
                </p>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="w-full bg-gray-100 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5 border border-gray-100 rounded-lg">
                  {staffList.length === 0 ? (
                    <div className="flex justify-center py-4"><Loader2 size={16} className="text-gray-300 animate-spin" /></div>
                  ) : (
                    filteredStaff.map((staff) => {
                      const isSelected = selectedMembers.includes(staff.id);
                      return (
                        <label
                          key={staff.id}
                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-emerald-500' : 'bg-gray-200'
                          }`}>
                            {isSelected ? <Check size={14} className="text-white" /> : (
                              <span className="text-gray-500 text-xs font-semibold">{staff.full_name?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 text-sm font-medium truncate">{staff.full_name}</p>
                            <p className="text-gray-400 text-xs">{staff.role}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedMembers(prev =>
                                e.target.checked ? [...prev, staff.id] : prev.filter(id => id !== staff.id)
                              );
                            }}
                            className="sr-only"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* NEW DIRECT MODE */}
          {mode === 'new-direct' && (
            <div className="p-4 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Search by name or role..."
                  className="w-full bg-gray-100 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {filteredStaff.length === 0 ? (
                  <div className="flex justify-center py-4"><Loader2 size={16} className="text-gray-300 animate-spin" /></div>
                ) : (
                  filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                        selectedStaff === staff.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">{staff.full_name?.charAt(0) || 'U'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">{staff.full_name}</p>
                        <p className="text-gray-400 text-xs">{staff.role}</p>
                      </div>
                      {selectedStaff === staff.id && <Check size={16} className="text-emerald-500 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          {mode === 'new-group' && (
            <button
              onClick={handleCreateGroup}
              disabled={loading || !groupName.trim() || selectedMembers.length === 0}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
              Create Group
            </button>
          )}
          {mode === 'new-direct' && (
            <button
              onClick={handleStartDirect}
              disabled={loading || !selectedStaff}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
              Start Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
