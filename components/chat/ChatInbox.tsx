"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat, Channel } from '@/lib/contexts/ChatContext';
import GroupManagementModal from './GroupManagementModal';
import {
  Search, Plus, Loader2, Send, Paperclip, Edit, Trash2, Settings,
  Download, X, Users, User, CheckCheck, ArrowLeft, Check, MessageSquare,
  FileText, Truck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

interface ChatInboxProps {
  userId: string;
  tenantId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatInbox({ userId, tenantId, isOpen, onClose }: ChatInboxProps) {
  const {
    channels, activeChannel, messages, loadingChannels, loadingMessages,
    sendingMessage, selectChannel, sendMessage, pinnedMessages, totalUnread,
    typingUsers, startTyping, stopTyping, sendAttachment, editMessage,
    deleteMessage, fetchChannels, getOrCreateDirectChat, createGroup, getOrCreateChannel,
  } = useChat();

  const channelUnreadMap = new Map<string, number>();
  channels.forEach((ch) => {
    if (ch.unread_count && ch.unread_count > 0) {
      channelUnreadMap.set(ch.id, ch.unread_count);
    }
  });

  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [showGroupManagement, setShowGroupManagement] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedForGroup, setSelectedForGroup] = useState<Set<string>>(new Set());
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showLinkWOJO, setShowLinkWOJO] = useState(false);
  const [wojoSearch, setWojoSearch] = useState('');
  const [wojoResults, setWojoResults] = useState<any[]>([]);
  const [wojoLoading, setWojoLoading] = useState(false);
  const [wojoTab, setWojoTab] = useState<'wo' | 'jo'>('wo');

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staffList, setStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // [AI] States for operational context overlay
  const [wojoContext, setWojoContext] = useState<any>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [showContextOverlay, setShowContextOverlay] = useState(false);

  // [AI] Fetch operational context for WO/JO channels
  const fetchOperationalDetails = async (channelType: string, channelId: string) => {
    setLoadingContext(true);
    try {
      if (channelType === 'work_order') {
        const { data: wo } = await supabase
          .from('work_orders')
          .select(`
            id, wo_number, order_date, execution_date,
            customers:md_entities!customer_id (name, legal_name),
            wo_items (
              id, sbu_type, total_revenue, item_data,
              job_orders (
                id, jo_number, status, purchase_price, advance_amount,
                fleets:fleet_id (plate_number, companies:md_entities (name))
              )
            )
          `)
          .eq('id', channelId)
          .maybeSingle();

        if (wo) {
          const customerName = wo.customers?.legal_name || wo.customers?.name || "TBA";
          const transporters = new Set<string>();
          let totalQty = 0;
          wo.wo_items?.forEach((item: any) => {
            totalQty += Number(item.item_data?.unit_count || 1);
            item.job_orders?.forEach((jo: any) => {
              const transporter = jo.fleets?.companies?.name || "Internal";
              transporters.add(transporter);
            });
          });
          
          setWojoContext({
            number: wo.wo_number,
            customer: customerName,
            transporter: transporters.size > 0 ? Array.from(transporters).join(", ") : "Internal",
            orderDate: wo.order_date || "TBA",
            executionDate: wo.execution_date || "TBA",
            quantity: `${totalQty} Units / Stops`
          });
        }
      } else if (channelType === 'job_order') {
        const { data: jo } = await supabase
          .from('job_orders')
          .select(`
            id, jo_number, status, purchase_price, advance_amount,
            fleets:fleet_id (plate_number, companies:md_entities (name)),
            wo_item:wo_items!wo_item_id (
              id, sbu_type, item_data,
              work_orders (
                id, wo_number, order_date, execution_date,
                customers:md_entities!customer_id (name, legal_name)
              )
            )
          `)
          .eq('id', channelId)
          .maybeSingle();

        if (jo) {
          const wo = jo.wo_item?.work_orders;
          const customerName = wo?.customers?.legal_name || wo?.customers?.name || "TBA";
          const transporter = jo.fleets?.companies?.name || "Internal";
          setWojoContext({
            number: jo.jo_number,
            customer: customerName,
            transporter: transporter,
            orderDate: wo?.order_date || "TBA",
            executionDate: wo?.execution_date || "TBA",
            quantity: (jo.wo_item?.item_data as any)?.unit_count ? `${(jo.wo_item.item_data as any).unit_count} Units` : "1 Unit"
          });
        }
      }
    } catch (err) {
      console.error("Error loading operational context details:", err);
    } finally {
      setLoadingContext(false);
    }
  };

  useEffect(() => {
    if (activeChannel && (activeChannel.channel_type === 'work_order' || activeChannel.channel_type === 'job_order')) {
      fetchOperationalDetails(activeChannel.channel_type, activeChannel.channel_id);
    } else {
      setWojoContext(null);
      setShowContextOverlay(false);
    }
  }, [activeChannel]);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchStaff();
    }
  }, [isOpen, tenantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    setLoadingStaff(true);
    try {
      const { data: tenantUsers, error } = await supabase
        .from('tenant_users')
        .select('user_id, role_code, full_name, whatsapp')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('full_name');

      if (error) {
        console.error('[ChatInbox] tenant_users error:', error.message);
        setStaffList([]);
        return;
      }

      const merged = (tenantUsers || []).map(tu => ({
        id: tu.user_id,
        email: '',
        full_name: tu.full_name || 'Unknown',
        role: tu.role_code || 'staff',
        avatar_url: null,
        whatsapp: tu.whatsapp,
      }));

      setStaffList(merged);
    } catch (err) {
      console.error('[ChatInbox] Failed to fetch staff:', err);
      setStaffList([]);
    } finally {
      setLoadingStaff(false);
    }
  }, [tenantId]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput('');
    stopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value) startTyping();
    else stopTyping();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    try {
      await sendAttachment(file);
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Failed to upload file');
    }
    if (e.target) e.target.value = '';
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      await editMessage(messageId, editText);
      toast.success('Message updated');
      setEditingMessageId(null);
      setEditText('');
    } catch (err) {
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete message');
    }
    setMessageMenuId(null);
  };

  const startEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditText(msg.message);
    setMessageMenuId(null);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleOpenDirectChat = async (otherUserId: string) => {
    // Optimistic: langsung select channel tanpa nunggu fetchChannels
    const existingChannel = channels.find(
      (ch) => ch.channel_type === 'direct' && ch.participants?.some((p: any) => p.user_id === otherUserId)
    );
    
    if (existingChannel) {
      selectChannel(existingChannel);
      setShowMobileChat(true);
      return;
    }

    // Channel belum ada, create new
    const channel = await getOrCreateDirectChat(otherUserId);
    if (channel) {
      selectChannel(channel);
      setShowMobileChat(true);
    }
  };

  const handleCreateGroup = async () => {
    console.log('[CreateGroup UI] Attempting...', { name: newGroupName, members: selectedForGroup.size, creatingGroup });
    if (!newGroupName.trim() || selectedForGroup.size === 0) {
      console.warn('[CreateGroup UI] Validation failed:', { nameEmpty: !newGroupName.trim(), noMembers: selectedForGroup.size === 0 });
      return;
    }
    setCreatingGroup(true);
    try {
      const members = [userId, ...Array.from(selectedForGroup)];
      console.log('[CreateGroup UI] Calling createGroup with members:', members);
      const channel = await createGroup(newGroupName.trim(), newGroupDesc.trim(), members);
      console.log('[CreateGroup UI] createGroup returned:', channel);
      if (channel) {
        selectChannel(channel);
        setShowMobileChat(true);
        setShowCreateGroup(false);
        setSelectedForGroup(new Set());
        setNewGroupName('');
        setNewGroupDesc('');
        toast.success('Group created');
      } else {
        toast.error('Failed to create group. Check console for details.');
      }
    } catch (err) {
      console.error('[CreateGroup UI] Error:', err);
      toast.error('Error creating group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const searchWOJO = useCallback(async (query: string, type: 'wo' | 'jo') => {
    if (!tenantId) {
      setWojoResults([]);
      return;
    }
    setWojoLoading(true);
    try {
      const table = type === 'wo' ? 'work_orders' : 'job_orders';
      const numberCol = type === 'wo' ? 'wo_number' : 'jo_number';
      
      let dbQuery = supabase
        .from(table)
        .select(`id, ${numberCol}, status, tenant_id`)
        .eq('tenant_id', tenantId);

      if (query.trim().length >= 2) {
        dbQuery = dbQuery.ilike(numberCol, `%${query}%`);
      }

      const { data, error } = await dbQuery
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWojoResults(data || []);
    } catch (err) {
      console.error('[WOJO Search] Error:', err);
      setWojoResults([]);
    } finally {
      setWojoLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (showLinkWOJO && tenantId) {
      searchWOJO('', wojoTab);
    }
  }, [showLinkWOJO, wojoTab, tenantId, searchWOJO]);

  const handleLinkWOJO = async (item: any) => {
    const type = wojoTab === 'wo' ? 'work_order' : 'job_order';
    const channel = await getOrCreateChannel(type, item.id, item.wo_number || item.jo_number);
    if (channel) {
      selectChannel(channel);
      setShowMobileChat(true);
      setShowLinkWOJO(false);
      setWojoSearch('');
      setWojoResults([]);
      toast.success(`Linked to ${item.wo_number || item.jo_number}`);
    } else {
      toast.error('Failed to link WO/JO');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredStaff = staffList.filter((s) =>
    s.id !== userId && (
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.role?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const sortedStaff = filteredStaff.map((staff) => {
    const directChannel = channels.find(
      (ch) => ch.channel_type === 'direct' && ch.channel_id.includes(staff.id)
    );
    return {
      ...staff,
      _channel: directChannel || null,
      _unread: directChannel ? channelUnreadMap.get(directChannel.id) || 0 : 0,
      _lastMsgTime: directChannel?.last_message?.created_at || '',
    };
  }).sort((a, b) => {
    if (a._unread > 0 && b._unread === 0) return -1;
    if (a._unread === 0 && b._unread > 0) return 1;
    if (a._lastMsgTime && b._lastMsgTime) return b._lastMsgTime.localeCompare(a._lastMsgTime);
    if (a._lastMsgTime) return -1;
    if (b._lastMsgTime) return 1;
    return 0;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-6xl h-[90vh] md:h-[85vh] flex bg-white rounded-lg md:rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        {/* Left Sidebar - Tenant Users */}
        <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-gray-200`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-600">
            <div className="flex items-center gap-2">
              <h2 className="text-white text-lg font-semibold">Sentralogis Chat</h2>
              {totalUnread > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-emerald-100 text-xs">{staffList.length} members</p>
              <button
                onClick={() => setShowLinkWOJO(true)}
                className="w-9 h-9 rounded-full bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center transition-colors"
                title="Link WO/JO"
              >
                <FileText size={18} className="text-white" />
              </button>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-9 h-9 rounded-full bg-emerald-700 hover:bg-emerald-800 flex items-center justify-center transition-colors"
                title="Create Group"
              >
                <Users size={18} className="text-white" />
              </button>
              <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-emerald-700 flex items-center justify-center transition-colors">
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 bg-white border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or role..."
                className="w-full bg-gray-100 rounded-lg pl-10 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto">
            {loadingStaff ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-gray-300 animate-spin" />
              </div>
            ) : (
              <>
                {/* Groups & WO/JO Section */}
                {channels.filter((ch) => ch.channel_type !== 'direct').length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-4 py-2 bg-gray-50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Groups & Operations</p>
                    </div>
                    {channels
                      .filter((ch) => ch.channel_type !== 'direct')
                      .sort((a, b) => {
                        // Groups first, then WO/JO/Lead
                        if (a.channel_type === 'group' && b.channel_type !== 'group') return -1;
                        if (a.channel_type !== 'group' && b.channel_type === 'group') return 1;
                        return 0;
                      })
                      .map((group) => {
                        const isWOJO = group.channel_type === 'work_order' || group.channel_type === 'job_order';
                        const isLead = group.channel_type === 'lead';
                        const unreadCount = channelUnreadMap.get(group.id) || 0;
                        const isActive = activeChannel?.id === group.id;
                        const lastMsg = group.last_message;
                        return (
                          <button
                            key={group.id}
                            onClick={() => {
                              selectChannel(group);
                              setShowMobileChat(true);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                              isActive ? 'bg-emerald-50' : ''
                            } ${unreadCount > 0 ? 'bg-gray-50' : ''}`}
                          >
                            <div className="relative">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                isWOJO 
                                  ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                                  : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                              }`}>
                                {isWOJO ? (
                                  group.channel_type === 'work_order' ? <FileText size={20} className="text-white" /> : <Truck size={20} className="text-white" />
                                ) : (
                                  <Users size={20} className="text-white" />
                                )}
                              </div>
                              {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between">
                                <p className={`text-sm font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-900'}`}>{group.group_name || group.title || 'Group'}</p>
                                {lastMsg && (
                                  <span className={`text-[10px] flex-shrink-0 ml-2 ${unreadCount > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>{formatTime(lastMsg.created_at)}</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-gray-500 text-xs">
                                  {isWOJO 
                                    ? (group.channel_type === 'work_order' ? 'Work Order' : 'Job Order')
                                    : isLead ? 'Guest Portal Chat' : `${group.participants?.length || 0} members`
                                  }
                                </p>
                                {lastMsg && (
                                  <p className={`text-[11px] truncate ml-2 max-w-[140px] ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                    {lastMsg.sender?.full_name ? `${lastMsg.sender.full_name}: ` : ''}{lastMsg.message}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}

                {/* Direct Chats Section */}
                <div>
                  <div className="px-4 py-2 bg-gray-50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Direct Chats</p>
                  </div>
                  {sortedStaff.length > 0 ? (
                    sortedStaff.map((staff) => {
                      const unreadCount = staff._unread;
                      const isActive = activeChannel?.id === staff._channel?.id;
                      const lastMsg = staff._channel?.last_message;
                      return (
                        <button
                          key={staff.id}
                          onClick={() => handleOpenDirectChat(staff.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                            isActive ? 'bg-emerald-50' : ''
                          } ${unreadCount > 0 ? 'bg-gray-50' : ''}`}
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                              {staff.avatar_url ? (
                                <img src={staff.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-white text-lg font-semibold">{staff.full_name?.charAt(0) || 'U'}</span>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-semibold truncate ${unreadCount > 0 ? 'text-gray-900' : 'text-gray-900'}`}>{staff.full_name || 'Unknown'}</p>
                              {lastMsg && (
                                <span className={`text-[10px] flex-shrink-0 ml-2 ${unreadCount > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>{formatTime(lastMsg.created_at)}</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-gray-500 text-xs capitalize truncate">{staff.role?.replace('_', ' ')}</p>
                              {lastMsg && (
                                <p className={`text-[11px] truncate ml-2 max-w-[140px] ${unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                  {lastMsg.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                      <Users size={48} className="mb-3 opacity-20" />
                      <p className="text-sm">No members found</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Chat Area */}
        <div className={`${!showMobileChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2]`}>
          {activeChannel ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 shadow-sm select-none">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden w-8 h-8 rounded-full hover:bg-gray-200 flex items-center justify-center"
                >
                  <ArrowLeft size={18} className="text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                  {activeChannel.channel_type === 'direct' ? (
                    <User size={18} className="text-white" />
                  ) : (
                    <Users size={18} className="text-white" />
                  )}
                </div>
                {/* Make header interactive for WO/JO channels */}
                {(activeChannel.channel_type === 'work_order' || activeChannel.channel_type === 'job_order') ? (
                  <div 
                    onClick={() => setShowContextOverlay(!showContextOverlay)}
                    className="flex-1 min-w-0 cursor-pointer hover:bg-gray-100/80 p-1 rounded-xl transition-all duration-200 flex items-center justify-between group"
                    title="Click to view operational details"
                  >
                    <div>
                      <p className="text-gray-900 text-sm font-bold truncate group-hover:text-emerald-600 transition-colors">
                        {activeChannel.title || activeChannel.group_name || 'Chat'}
                      </p>
                      <p className="text-emerald-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 mt-0.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Click to view details
                      </p>
                    </div>
                    {loadingContext && <Loader2 size={12} className="text-slate-400 animate-spin mr-4" />}
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-semibold truncate">
                      {activeChannel.channel_type === 'direct'
                        ? (activeChannel.participants?.find((p: any) => p.user_id !== userId)?.profile?.full_name || (activeChannel.participants?.find((p: any) => p.user_id !== userId) as any)?.full_name || activeChannel.title || 'Chat')
                        : activeChannel.title || activeChannel.group_name || 'Chat'}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {activeChannel.channel_type === 'group'
                        ? `${activeChannel.participants?.length || 0} members`
                        : activeChannel.participants?.find((p: any) => p.user_id !== userId)?.role?.replace('_', ' ') || 'Direct message'}
                    </p>
                  </div>
                )}
                {activeChannel.channel_type === 'group' && (
                  <button
                    onClick={() => setShowGroupManagement(true)}
                    className="w-9 h-9 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                  >
                    <Settings size={16} className="text-gray-500" />
                  </button>
                )}
              </div>

              {/* [AI] Operational Context Overlay Card - Redesigned to be a crisp white page with solid black text as requested */}
              {showContextOverlay && wojoContext && (
                <div 
                  className="bg-white border-b-2 border-black shadow-lg p-6 animate-in slide-in-from-top duration-300 relative z-40 text-black"
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the card
                >
                  <button 
                    onClick={() => setShowContextOverlay(false)} 
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-black hover:text-red-600 transition-colors"
                    aria-label="Close details"
                  >
                    <X size={20} className="stroke-[2.5]" />
                  </button>
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-300">
                      <div className="w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center flex-shrink-0">
                        {activeChannel.channel_type === 'work_order' ? <FileText size={18} /> : <Truck size={18} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-black">
                          {activeChannel.channel_type === 'work_order' ? 'Detail Work Order' : 'Detail Job Order'}
                        </h4>
                        <p className="text-sm font-black mt-0.5 text-black">{wojoContext.number}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-xs text-black">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black">Pelanggan</span>
                        <span className="font-bold text-sm block leading-snug text-black">{wojoContext.customer}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black">Transporter</span>
                        <span className="font-bold text-sm block leading-snug text-black">{wojoContext.transporter}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black">Order / Eksekusi</span>
                        <span className="font-bold text-sm block leading-snug text-black mt-0.5">
                          {wojoContext.orderDate} &mdash; <span className="font-black underline">{wojoContext.executionDate}</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider block text-black">Jumlah Pesanan</span>
                        <span className="font-bold text-sm block text-black">{wojoContext.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto px-4 md:px-12 py-4 space-y-1" 
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23c8c1b8\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
                onClick={() => setShowContextOverlay(false)} // Clicking inside the messages area will dismiss the overlay
              >
                {loadingMessages && (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="text-gray-300 animate-spin" />
                  </div>
                )}
                {messages.length === 0 && !loadingMessages && (
                  <div className="flex justify-center py-12">
                    <div className="bg-white/80 rounded-lg px-4 py-2 shadow-sm">
                      <p className="text-gray-500 text-xs text-center">No messages yet. Say hello!</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isOwnMessage = msg.sender_id === userId;
                  const isEditing = editingMessageId === msg.id;
                  const showName = !isOwnMessage && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);

                  const senderColors = [
                    'text-emerald-600', 'text-blue-600', 'text-purple-600',
                    'text-orange-600', 'text-pink-600', 'text-teal-600',
                  ];
                  const colorIdx = msg.sender_id ? msg.sender_id.charCodeAt(0) % senderColors.length : 0;
                  const senderColor = senderColors[colorIdx];

                  return (
                    <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${showName ? 'mt-3' : 'mt-0.5'} group`}>
                      {showName && !isOwnMessage && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                          <span className="text-white text-[10px] font-semibold">{msg.sender?.full_name?.charAt(0) || 'U'}</span>
                        </div>
                      )}
                      {!isOwnMessage && !showName && <div className="w-9" />}
                      <div className={`relative max-w-[75%] md:max-w-[65%] ${isOwnMessage ? 'order-1' : ''}`}>
                        {showName && !isOwnMessage && (
                          <p className={`text-xs font-semibold mb-0.5 ml-1 ${senderColor}`}>
                            {msg.sender?.full_name || 'Unknown'}
                          </p>
                        )}
                        <div className={`px-3 py-1.5 rounded-lg shadow-sm ${
                          isOwnMessage ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm'
                        }`}>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleEditMessage(msg.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
                                autoFocus
                              />
                              <button onClick={() => handleEditMessage(msg.id)} className="text-emerald-600 text-xs font-medium">Save</button>
                              <button onClick={cancelEdit} className="text-gray-400 text-xs">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <p className="text-gray-800 text-sm leading-relaxed break-words">{msg.message}</p>
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {msg.attachments.map((att: any) => (
                                    <a
                                      key={att.id}
                                      href={att.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-100 hover:bg-gray-200 transition-colors text-xs"
                                    >
                                      <Paperclip size={12} className="text-gray-500" />
                                      <span className="text-gray-600 truncate">{att.file_name}</span>
                                      <Download size={12} className="text-gray-400" />
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-0.5`}>
                                <span className="text-gray-400 text-[10px]">{formatTime(msg.created_at)}</span>
                                {isOwnMessage && <CheckCheck size={12} className="text-blue-500" />}
                              </div>
                            </>
                          )}
                        </div>
                        {isOwnMessage && !isEditing && (
                          <div className="absolute -left-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setMessageMenuId(messageMenuId === msg.id ? null : msg.id)}
                              className="w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
                                <circle cx="12" cy="5" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="12" cy="19" r="2" />
                              </svg>
                            </button>
                            {messageMenuId === msg.id && (
                              <div className="absolute left-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[100px]">
                                <button onClick={() => startEdit(msg)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                                  <Edit size={12} /> Edit
                                </button>
                                <button onClick={() => handleDeleteMessage(msg.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50">
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
                      <p className="text-gray-400 text-xs italic">typing...</p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input Area */}
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors">
                    <Paperclip size={20} className="text-gray-500" />
                  </button>
                  <div className="flex-1 bg-white rounded-lg border border-gray-200 px-4 py-2.5">
                    <input
                      type="text"
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                      placeholder="Type a message"
                      disabled={sendingMessage}
                      className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendingMessage}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 flex items-center justify-center transition-colors shadow-sm"
                  >
                    {sendingMessage ? <Loader2 size={18} className="text-white animate-spin" /> : <Send size={18} className="text-white" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={32} className="text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">Select a member to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCreateGroup(false)}>
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600">
                <button onClick={() => setShowCreateGroup(false)} className="w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center">
                  <ArrowLeft size={18} className="text-white" />
                </button>
                <h2 className="text-white text-base font-semibold flex-1">Create Group</h2>
              </div>
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none"
                />
                <div>
                  <p className="text-gray-500 text-xs font-semibold mb-2">
                    Select members ({selectedForGroup.size} selected)
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 border border-gray-100 rounded-lg">
                    {filteredStaff.map((staff) => {
                      const isSelected = selectedForGroup.has(staff.id);
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
                              setSelectedForGroup(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(staff.id);
                                else next.delete(staff.id);
                                return next;
                              });
                            }}
                            className="sr-only"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim() || selectedForGroup.size === 0}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                  Create Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link WO/JO Modal */}
        {showLinkWOJO && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowLinkWOJO(false)}>
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-600">
                <button onClick={() => setShowLinkWOJO(false)} className="w-8 h-8 rounded-full hover:bg-emerald-700 flex items-center justify-center">
                  <ArrowLeft size={18} className="text-white" />
                </button>
                <h2 className="text-white text-base font-semibold flex-1">Link WO / JO</h2>
              </div>
              <div className="p-4 space-y-4">
                {/* Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setWojoTab('wo'); setWojoResults([]); setWojoSearch(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      wojoTab === 'wo' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FileText size={14} className="inline mr-1" /> Work Order
                  </button>
                  <button
                    onClick={() => { setWojoTab('jo'); setWojoResults([]); setWojoSearch(''); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      wojoTab === 'jo' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Truck size={14} className="inline mr-1" /> Job Order
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={wojoSearch}
                    onChange={(e) => {
                      setWojoSearch(e.target.value);
                      searchWOJO(e.target.value, wojoTab);
                    }}
                    placeholder={`Search ${wojoTab === 'wo' ? 'WO' : 'JO'} number...`}
                    className="w-full bg-gray-100 rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                {/* Results */}
                <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-100 rounded-lg">
                  {wojoLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={20} className="text-gray-300 animate-spin" />
                    </div>
                  ) : wojoResults.length > 0 ? (
                    wojoResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleLinkWOJO(item)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          {wojoTab === 'wo' ? <FileText size={14} className="text-emerald-600" /> : <Truck size={14} className="text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{item.wo_number || item.jo_number}</p>
                          <p className="text-xs text-gray-400 capitalize">{item.status?.replace('_', ' ')}</p>
                        </div>
                        <ArrowLeft size={14} className="text-gray-300 rotate-180" />
                      </button>
                    ))
                  ) : wojoSearch.trim().length > 0 ? (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      No {wojoTab === 'wo' ? 'Work Orders' : 'Job Orders'} found
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-sm">
                      No recent {wojoTab === 'wo' ? 'Work Orders' : 'Job Orders'} found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Group Management Modal */}
        {showGroupManagement && activeChannel?.group_id && (
          <GroupManagementModal
            groupId={activeChannel.group_id}
            groupName={activeChannel.group_name || activeChannel.title || 'Group'}
            onClose={() => setShowGroupManagement(false)}
            onUpdate={() => fetchChannels()}
          />
        )}
      </div>
    </div>
  );
}
