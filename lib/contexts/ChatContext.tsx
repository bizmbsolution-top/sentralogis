"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useReducer } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────
interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface Participant {
  user_id: string;
  role: 'member' | 'admin';
  last_read_at: string | null;
  profile: Profile;
}

export interface Channel {
  id: string;
  channel_type: 'job_order' | 'work_order' | 'direct' | 'group' | 'lead';
  channel_id: string;
  title: string | null;
  created_at: string;
  participants: Participant[];
  last_message?: Message | null;
  unread_count?: number;
  group_id?: string | null;
  group_name?: string | null;
  is_archived?: boolean;
}

interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  guest_sender_name?: string | null;
  message: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  sender: Profile | null;
  replies?: Message[];
  context_type?: string | null;
  context_id?: string | null;
  is_pinned?: boolean;
  attachments?: Attachment[];
}

interface ChatState {
  channels: Channel[];
  activeChannel: Channel | null;
  messages: Message[];
  loadingChannels: boolean;
  loadingMessages: boolean;
  sendingMessage: boolean;
  participants: Participant[];
  pinnedMessages: Message[];
}

interface ChatContextType extends ChatState {
  selectChannel: (channel: Channel) => Promise<void>;
  sendMessage: (text: string, parentId?: string) => Promise<void>;
  markAsRead: () => Promise<void>;
  getOrCreateChannel: (type: Channel['channel_type'], id: string, title?: string) => Promise<Channel | null>;
  getOrCreateDirectChat: (otherUserId: string) => Promise<Channel | null>;
  createGroup: (name: string, description: string, memberIds: string[]) => Promise<Channel | null>;
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
  totalUnread: number;
  fetchStaffList: () => Promise<Profile[]>;
  fetchWOJOContext: (woId: string) => Promise<any>;
  pinMessage: (messageId: string) => Promise<void>;
  unpinMessage: (messageId: string) => Promise<void>;
  uploadAttachment: (file: File, messageId: string) => Promise<{ file_url: string; file_name: string; file_type: string; file_size: number } | null>;
  sendAttachment: (file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  fetchGroupMembers: (groupId: string) => Promise<any[]>;
  addGroupMember: (groupId: string, userId: string) => Promise<void>;
  removeGroupMember: (groupId: string, userId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroupName: (groupId: string, newName: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  fetchChannels: () => Promise<void>;
}

type ChatAction =
  | { type: 'SET_CHANNELS'; payload: Channel[] }
  | { type: 'SET_ACTIVE_CHANNEL'; payload: Channel | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING_CHANNELS'; payload: boolean }
  | { type: 'SET_LOADING_MESSAGES'; payload: boolean }
  | { type: 'SET_SENDING_MESSAGE'; payload: boolean }
  | { type: 'SET_PARTICIPANTS'; payload: Participant[] }
  | { type: 'SET_PINNED_MESSAGES'; payload: Message[] }
  | { type: 'UPDATE_CHANNEL_LAST_MESSAGE'; payload: { channelId: string; message: Message } }
  | { type: 'INCREMENT_CHANNEL_UNREAD'; payload: string }
  | { type: 'RESET_UNREAD'; payload: string };

// ── Reducer ────────────────────────────────────────────
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHANNELS':
      return { ...state, channels: action.payload };
    case 'SET_ACTIVE_CHANNEL':
      return { ...state, activeChannel: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING_CHANNELS':
      return { ...state, loadingChannels: action.payload };
    case 'SET_LOADING_MESSAGES':
      return { ...state, loadingMessages: action.payload };
    case 'SET_SENDING_MESSAGE':
      return { ...state, sendingMessage: action.payload };
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };
    case 'SET_PINNED_MESSAGES':
      return { ...state, pinnedMessages: action.payload };
    case 'UPDATE_CHANNEL_LAST_MESSAGE':
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.payload.channelId
            ? { ...ch, last_message: action.payload.message }
            : ch
        ),
      };
    case 'INCREMENT_CHANNEL_UNREAD':
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.payload
            ? { ...ch, unread_count: (ch.unread_count || 0) + 1 }
            : ch
        ),
      };
    case 'RESET_UNREAD':
      return {
        ...state,
        channels: state.channels.map((ch) =>
          ch.id === action.payload ? { ...ch, unread_count: 0 } : ch
        ),
      };
    default:
      return state;
  }
}

const initialState: ChatState = {
  channels: [],
  activeChannel: null,
  messages: [],
  loadingChannels: false,
  loadingMessages: false,
  sendingMessage: false,
  participants: [],
  pinnedMessages: [],
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────
export function ChatProvider({ children, userId, tenantId: propTenantId }: { children: React.ReactNode; userId: string; tenantId?: string }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | undefined>(propTenantId);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const globalSubRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current user profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentUserProfile({ id: data.id, full_name: data.full_name || 'Unknown', role: data.role || 'staff', avatar_url: null });
        }
      });
  }, [userId]);

  // Resolve tenantId from tenant_users if not provided
  useEffect(() => {
    if (propTenantId) {
      setResolvedTenantId(propTenantId);
      return;
    }
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.tenant_id) {
          setResolvedTenantId(data.tenant_id);
        }
      });
    return () => { cancelled = true; };
  }, [userId, propTenantId]);

  const tenantId = resolvedTenantId;

  // ── Internal helpers ──
  const fetchUnreadCount = useCallback(async (channelId: string, lastReadAt: string | null): Promise<number> => {
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId)
      .gt('created_at', lastReadAt || '1970-01-01T00:00:00Z');
    return count || 0;
  }, []);

  const fetchLastMessage = useCallback(async (channelId: string): Promise<Message | null> => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:profiles!sender_id(id, full_name, role)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return null;
    const msg = data as any;
    return {
      ...msg,
      sender: msg.sender ? { ...msg.sender, avatar_url: null } : null,
    };
  }, []);

  const fetchParticipants = useCallback(async (channelId: string): Promise<Participant[]> => {
    const { data } = await supabase
      .from('chat_participants')
      .select('user_id, role, last_read_at, profile:profiles!user_id(id, full_name, role)')
      .eq('channel_id', channelId);

    return (data || []).map((p: any) => ({
      ...p,
      profile: p.profile ? { ...p.profile, avatar_url: null } : null,
    }));
  }, []);

  // ── Fetch channels ──
  const fetchChannels = useCallback(async () => {
    dispatch({ type: 'SET_LOADING_CHANNELS', payload: true });
    const { data, error } = await supabase
      .from('chat_participants')
      .select('channel_id, role, last_read_at, chat_channels!inner(id, channel_type, channel_id, title, created_at, group_id, is_archived)')
      .eq('user_id', userId)
      .order('created_at', { foreignTable: 'chat_channels', ascending: false });

    if (error) {
      console.error('[Chat] Failed to fetch channels:', error);
      dispatch({ type: 'SET_LOADING_CHANNELS', payload: false });
      return;
    }

    console.log('[FetchChannels] Raw data:', data);

    const channels: Channel[] = await Promise.all(
       
      (data || []).map(async (row: any) => {
        const chan = row.chat_channels;
        // Fetch group info separately to avoid join issues
        let groupInfo = null;
        if (chan.group_id) {
          const { data: gi } = await supabase
            .from('chat_groups')
            .select('id, name')
            .eq('id', chan.group_id)
            .single();
          groupInfo = gi;
        }
        // [AI] Check if work_order or job_order is paid or doesn't exist, and auto-archive it to hide it from the active inbox
        let isWOJOArchived = false;
        if (chan.channel_type === 'work_order') {
          const { data: wo } = await supabase
            .from('work_orders')
            .select('status')
            .eq('id', chan.channel_id)
            .maybeSingle();
          if (!wo || ['paid', 'invoiced', 'PAID', 'INVOICED'].includes(String(wo.status))) {
            isWOJOArchived = true;
          }
        } else if (chan.channel_type === 'job_order') {
          const { data: jo } = await supabase
            .from('job_orders')
            .select('status')
            .eq('id', chan.channel_id)
            .maybeSingle();
          if (!jo || ['paid', 'invoiced', 'PAID', 'INVOICED'].includes(String(jo.status))) {
            isWOJOArchived = true;
          }
        }

        const [unreadCount, lastMessage, participants] = await Promise.all([
          fetchUnreadCount(chan.id, row.last_read_at),
          fetchLastMessage(chan.id),
          fetchParticipants(chan.id),
        ]);
        return {
          id: chan.id,
          channel_type: chan.channel_type,
          channel_id: chan.channel_id,
          title: chan.title,
          created_at: chan.created_at,
          participants,
          last_message: lastMessage,
          unread_count: unreadCount,
          group_id: chan.group_id,
          group_name: groupInfo?.name || null,
          is_archived: chan.is_archived || isWOJOArchived || false,
        };
      })
    );

    // Filter: exclude archived channels UNLESS they have unread messages
    const activeChannels = channels.filter(ch => !ch.is_archived || (ch.unread_count && ch.unread_count > 0));

    console.log('[FetchChannels] Processed channels:', activeChannels);
    dispatch({ type: 'SET_CHANNELS', payload: activeChannels });
    dispatch({ type: 'SET_LOADING_CHANNELS', payload: false });
  }, [userId, fetchUnreadCount, fetchLastMessage, fetchParticipants]);

  // ── Subscribe to real-time messages ──
  const subscribeToChannel = useCallback((channelId: string) => {
    if (channelSubRef.current) {
      supabase.removeChannel(channelSubRef.current);
    }

    const msgSub = supabase
      .channel(`chat_messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        async (payload: RealtimePostgresChangesPayload<Message>) => {
          const newMsg = payload.new as Message;
          if (!newMsg.sender_id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          const senderProfile: Profile = profile
            ? { id: profile.id, full_name: profile.full_name || 'Unknown', role: profile.role || 'staff', avatar_url: null }
            : { id: newMsg.sender_id, full_name: 'Unknown', role: 'staff', avatar_url: null };

          const enriched: Message = {
            ...newMsg,
            sender: senderProfile,
          };

          dispatch({ type: 'ADD_MESSAGE', payload: enriched });
          dispatch({ type: 'UPDATE_CHANNEL_LAST_MESSAGE', payload: { channelId, message: enriched } });
          if (newMsg.sender_id !== userId) {
            dispatch({ type: 'INCREMENT_CHANNEL_UNREAD', payload: channelId });
          }
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { userId: typingUserId, isTyping, userName } = payload;
        if (typingUserId === userId) return;
        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(userName) ? prev : [...prev, userName];
          } else {
            return prev.filter((u) => u !== userName);
          }
        });
      })
      .subscribe();

    channelSubRef.current = msgSub;
  }, [userId]);

  // ── Select channel ──
  const selectChannel = useCallback(async (channel: Channel) => {
    dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: channel });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    setTypingUsers([]);
    dispatch({ type: 'SET_LOADING_MESSAGES', payload: true });

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, full_name, role),
        replies:chat_messages(*, sender:profiles!sender_id(id, full_name, role)),
        attachments:chat_attachments(id, file_url, file_name, file_type, file_size)
      `)
      .eq('channel_id', channel.id)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Chat] Failed to fetch messages:', error);
    } else {
      // Normalize: add avatar_url: null to sender objects
      const normalized = (data || []).map((msg: any) => ({
        ...msg,
        sender: msg.sender ? { ...msg.sender, avatar_url: null } : null,
        replies: (msg.replies || []).map((r: any) => ({
          ...r,
          sender: r.sender ? { ...r.sender, avatar_url: null } : null,
        })),
      }));
      dispatch({ type: 'SET_MESSAGES', payload: normalized });
    }

    // Fetch pinned messages
    const { data: pinnedData } = await supabase
      .from('chat_messages')
      .select(`*, sender:profiles!sender_id(id, full_name, role)`)
      .eq('channel_id', channel.id)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });

    const normalizedPinned = (pinnedData || []).map((msg: any) => ({
      ...msg,
      sender: msg.sender ? { ...msg.sender, avatar_url: null } : null,
    }));
    dispatch({ type: 'SET_PINNED_MESSAGES', payload: normalizedPinned });

    dispatch({ type: 'SET_LOADING_MESSAGES', payload: false });
    dispatch({ type: 'RESET_UNREAD', payload: channel.id });

    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', channel.id)
      .eq('user_id', userId);

    subscribeToChannel(channel.id);
  }, [userId, subscribeToChannel]);

  // ── Send message ──
  const sendMessage = useCallback(async (text: string, parentId?: string) => {
    if (!state.activeChannel || !text.trim()) return;
    dispatch({ type: 'SET_SENDING_MESSAGE', payload: true });

    const { error } = await supabase.from('chat_messages').insert({
      channel_id: state.activeChannel.id,
      sender_id: userId,
      message: text.trim(),
      parent_id: parentId || undefined,
      context_type: state.activeChannel.channel_type === 'direct' ? 'direct' : state.activeChannel.channel_type === 'group' ? 'group' : state.activeChannel.channel_type,
      context_id: state.activeChannel.channel_type === 'direct' ? undefined : state.activeChannel.channel_id,
    });

    if (error) console.error('[Chat] Failed to send message:', error);
    dispatch({ type: 'SET_SENDING_MESSAGE', payload: false });
  }, [state.activeChannel, userId]);

  // ── Get or create channel ──
  const getOrCreateChannel = useCallback(async (
    type: Channel['channel_type'],
    channelId: string,
    title?: string
  ): Promise<Channel | null> => {
    console.log('[GetOrCreateChannel] Called:', { type, channelId, title });

    const { data: existingData, error: existingError } = await (supabase
      .from('chat_channels' as any) as any)
      .select('*')
      .eq('channel_type', type)
      .eq('channel_id', channelId)
      .maybeSingle();
    const existing = existingData as any;

    if (existingError) {
      console.error('[GetOrCreateChannel] Query error:', existingError);
    }

    if (existing) {
      console.log('[GetOrCreateChannel] Found existing:', existing.id);
      const existingChannel = state.channels.find((c) => c.id === existing.id);
      if (existingChannel) return existingChannel;
      
      return {
        id: existing.id,
        channel_type: existing.channel_type,
        channel_id: existing.channel_id,
        title: existing.title,
        created_at: existing.created_at,
        participants: [],
        last_message: null,
        unread_count: 0,
        group_id: existing.group_id,
        group_name: null,
        is_archived: existing.is_archived || false,
      };
    }

    let finalTitle = title || '';
    if (!finalTitle && type === 'job_order') {
      const { data: jo } = await supabase.from('job_orders').select('jo_number').eq('id', channelId).single();
      finalTitle = jo?.jo_number || `JO-${channelId.slice(0, 8)}`;
    } else if (!finalTitle && type === 'work_order') {
      const { data: wo } = await supabase.from('work_orders').select('wo_number').eq('id', channelId).single();
      finalTitle = wo?.wo_number || `WO-${channelId.slice(0, 8)}`;
    }

    console.log('[GetOrCreateChannel] Inserting:', { channel_type: type, channel_id: channelId, title: finalTitle });

    const { data: newChannelData, error } = await (supabase
      .from('chat_channels' as any) as any)
      .insert({ channel_type: type, channel_id: channelId, title: finalTitle })
      .select()
      .single();
    const newChannel = newChannelData as any;

    if (error) {
      console.error('[GetOrCreateChannel] Insert error:', JSON.stringify(error, null, 2));
      return null;
    }

    console.log('[GetOrCreateChannel] Created:', newChannel.id);

    // Manually add current user as participant (bypass broken trigger)
    await supabase
      .from('chat_participants')
      .upsert(
        { channel_id: newChannel.id, user_id: userId, role: 'member' },
        { onConflict: 'channel_id,user_id', ignoreDuplicates: true }
      );

    await fetchChannels();
    return {
      id: newChannel.id,
      channel_type: newChannel.channel_type,
      channel_id: newChannel.channel_id,
      title: newChannel.title,
      created_at: newChannel.created_at,
      participants: [],
    };
  }, [fetchChannels, state.channels]);

  // ── Get or create direct chat ──
  const getOrCreateDirectChat = useCallback(async (otherUserId: string): Promise<Channel | null> => {
    console.log('[Chat] Creating direct chat:', { userId, otherUserId });

    // Check auth state
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[Chat] No active session');
      return null;
    }

    const ids = [userId, otherUserId].sort();
    const directChannelId = ids.join('-');

    // Try to find existing channel
    const { data: existingData, error: selectError } = await (supabase
      .from('chat_channels' as any) as any)
      .select('*')
      .eq('channel_type', 'direct')
      .eq('channel_id', directChannelId)
      .maybeSingle();
    const existing = existingData as any;

    if (selectError) {
      console.error('[Chat] Select error:', selectError);
    }

    if (existing) {
      console.log('[Chat] Found existing direct channel:', existing.id);
      // Jangan fetchChannels() - terlalu berat, cukup return channel data
      const existingChannel = state.channels.find((c) => c.id === existing.id);
      if (existingChannel) return existingChannel;
      
      // Kalau belum ada di state, construct minimal channel
      return {
        id: existing.id,
        channel_type: existing.channel_type,
        channel_id: existing.channel_id,
        title: existing.title,
        created_at: existing.created_at,
        participants: [],
        last_message: null,
        unread_count: 0,
        group_id: existing.group_id,
        group_name: null,
        is_archived: existing.is_archived || false,
      };
    }

    const { data: otherProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', otherUserId)
      .single();

    const channelTitle = otherProfile?.full_name || 'Direct Chat';

    console.log('[Chat] Creating new channel:', { channel_type: 'direct', channel_id: directChannelId, title: channelTitle });

    const { data: newChannelData, error } = await (supabase
      .from('chat_channels' as any) as any)
      .insert({
        channel_type: 'direct',
        channel_id: directChannelId,
        title: channelTitle,
      })
      .select()
      .single();
    const newChannel = newChannelData as any;

    if (error) {
      console.error('[Chat] Failed to create direct channel:', error);
      console.error('[Chat] Error details:', JSON.stringify(error));
      return null;
    }

    console.log('[Chat] Channel created:', newChannel.id);

    // Add participants
    await supabase.from('chat_participants').upsert([
      { channel_id: newChannel.id, user_id: userId, role: 'member' },
      { channel_id: newChannel.id, user_id: otherUserId, role: 'member' },
    ], { onConflict: 'channel_id,user_id', ignoreDuplicates: true });

    // Jangan fetchChannels() - terlalu berat
    // Return channel langsung, sidebar akan update via realtime subscription
    return {
      id: newChannel.id,
      channel_type: newChannel.channel_type,
      channel_id: newChannel.channel_id,
      title: channelTitle,
      created_at: newChannel.created_at,
      participants: [],
      last_message: null,
      unread_count: 0,
      group_id: newChannel.group_id,
      group_name: null,
      is_archived: newChannel.is_archived || false,
    };
  }, [userId, state.channels]);

  // ── Create group ──
  const createGroup = useCallback(async (name: string, description: string, memberIds: string[]): Promise<Channel | null> => {
    console.log('[CreateGroup] Called with:', { name, description, memberCount: memberIds.length, tenantId });
    if (!tenantId) {
      console.error('[CreateGroup] tenantId is undefined! Cannot create group.');
      return null;
    }

    const { data: newGroupData, error: groupError } = await (supabase
      .from('chat_groups' as any) as any)
      .insert({ tenant_id: tenantId, name, group_type: 'custom', description, created_by: userId })
      .select()
      .single();
    const newGroup = newGroupData as any;

    if (groupError) {
      console.error('[CreateGroup] Failed to create group:', groupError);
      return null;
    }

    console.log('[CreateGroup] Group created:', newGroup.id);

    const members = memberIds.map((uid) => ({ group_id: newGroup.id, user_id: uid, role: uid === userId ? 'admin' : 'member' }));
    const { error: membersError } = await supabase.from('chat_group_members').insert(members);
    if (membersError) console.error('[CreateGroup] Failed to add group members:', membersError);

    const { data: newChannelData, error: channelError } = await (supabase
      .from('chat_channels' as any) as any)
      .insert({ channel_type: 'group', channel_id: newGroup.id, title: name, group_id: newGroup.id })
      .select()
      .single();
    const newChannel = newChannelData as any;

    if (channelError) {
      console.error('[CreateGroup] Failed to create group channel:', channelError);
      return null;
    }

    console.log('[CreateGroup] Channel created:', newChannel.id);

    // Add all members as channel participants
    const participants = memberIds.map((uid) => ({ channel_id: newChannel.id, user_id: uid, role: uid === userId ? 'admin' : 'member' }));
    const { error: participantsError } = await supabase.from('chat_participants').insert(participants);
    if (participantsError) console.error('[CreateGroup] Failed to add channel participants:', participantsError);

    await fetchChannels();
    return {
      id: newChannel.id,
      channel_type: 'group',
      channel_id: newGroup.id,
      title: newChannel.title,
      created_at: newChannel.created_at,
      participants: [],
      group_id: newGroup.id,
      group_name: name,
    };
  }, [tenantId, userId, fetchChannels]);

  // ── Fetch staff list ──
  const fetchStaffList = useCallback(async (): Promise<Profile[]> => {
    if (!tenantId) return [];

    const { data: tenantUsers, error } = await supabase
      .from('tenant_users')
      .select('user_id, role_code, full_name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('full_name');

    if (error || !tenantUsers) return [];

    return tenantUsers.map(tu => ({
      id: tu.user_id || '',
      full_name: tu.full_name || 'Unknown',
      avatar_url: null,
      role: tu.role_code || 'staff',
    }));
  }, [tenantId]);

  // ── Fetch WO/JO context ──
  const fetchWOJOContext = useCallback(async (woId: string) => {
    const { data: wo } = await supabase
      .from('work_orders')
      .select('*, customer:md_entities!customer_id(name)')
      .eq('id', woId)
      .single();

    if (!wo) return null;

    const { data: items } = await supabase
      .from('wo_items')
      .select('*')
      .eq('wo_id', woId);

    const joIds = (items as any[])?.flatMap((item: any) => item.id) || [];
    const { data: jobs } = await supabase
      .from('job_orders')
      .select('*, driver:md_drivers(name), fleet:md_fleets(plate_number)')
      .in('wo_item_id' as any, joIds);

    return {
      work_order: wo,
      items: (items as any[])?.map((item: any) => ({
        ...item,
        job_orders: (jobs as any[])?.filter((j: any) => (j as any).wo_item_id === item.id) || [],
      })) || [],
    };
  }, []);

  // ── Pin/Unpin message ──
  const pinMessage = useCallback(async (messageId: string) => {
    if (!state.activeChannel) return;
    await supabase
      .from('chat_messages')
      .update({ is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: userId })
      .eq('id', messageId);

    const { data } = await supabase
      .from('chat_messages')
      .select(`*, sender:profiles!sender_id(id, full_name, role)`)
      .eq('channel_id', state.activeChannel.id)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });
    const normalizedPinned = (data || []).map((msg: any) => ({
      ...msg,
      sender: msg.sender ? { ...msg.sender, avatar_url: null } : null,
    }));
    dispatch({ type: 'SET_PINNED_MESSAGES', payload: normalizedPinned });
  }, [state.activeChannel, userId]);

  const unpinMessage = useCallback(async (messageId: string) => {
    if (!state.activeChannel) return;
    await supabase
      .from('chat_messages')
      .update({ is_pinned: false, pinned_at: undefined, pinned_by: undefined })
      .eq('id', messageId);

    const { data } = await supabase
      .from('chat_messages')
      .select(`*, sender:profiles!sender_id(id, full_name, role)`)
      .eq('channel_id', state.activeChannel.id)
      .eq('is_pinned', true)
      .order('pinned_at', { ascending: false });
    const normalizedPinned = (data || []).map((msg: any) => ({
      ...msg,
      sender: msg.sender ? { ...msg.sender, avatar_url: null } : null,
    }));
    dispatch({ type: 'SET_PINNED_MESSAGES', payload: normalizedPinned });
  }, [state.activeChannel, userId]);

  // ── Mark as read ──
  const markAsRead = useCallback(async () => {
    if (!state.activeChannel) return;
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('channel_id', state.activeChannel.id)
      .eq('user_id', userId);
    dispatch({ type: 'RESET_UNREAD', payload: state.activeChannel.id });
  }, [state.activeChannel, userId]);

  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (channelSubRef.current && state.activeChannel) {
      channelSubRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId,
          userName: currentUserProfile?.full_name || 'Someone',
          isTyping
        }
      });
    }
  }, [userId, currentUserProfile, state.activeChannel]);

  // ── Typing indicators ──
  const startTyping = useCallback(() => {
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
    }, 3000);
  }, [broadcastTyping]);

  const stopTyping = useCallback(() => {
    broadcastTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [broadcastTyping]);

  // ── Total unread ──
  const totalUnread = state.channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0);

  // ── Attachment upload ──
  const uploadAttachment = useCallback(async (file: File, messageId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${messageId}/${Date.now()}.${fileExt}`;
    const filePath = `chat-attachments/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file);

    if (uploadError) {
      console.error('[Chat] Failed to upload file:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(filePath);

    return {
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    };
  }, []);

  const sendAttachment = useCallback(async (file: File) => {
    if (!state.activeChannel) return;
    dispatch({ type: 'SET_SENDING_MESSAGE', payload: true });

    const { data: messageData, error: msgError } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: state.activeChannel.id,
        sender_id: userId,
        message: `📎 ${file.name}`,
        parent_id: undefined,
        context_type: state.activeChannel.channel_type === 'direct' ? 'direct' : state.activeChannel.channel_type === 'group' ? 'group' : state.activeChannel.channel_type,
        context_id: state.activeChannel.channel_type === 'direct' ? undefined : state.activeChannel.channel_id,
      })
      .select()
      .single();
    const message = messageData as any;

    if (msgError || !message) {
      console.error('[Chat] Failed to send message:', msgError);
      dispatch({ type: 'SET_SENDING_MESSAGE', payload: false });
      return;
    }

    const attachment = await uploadAttachment(file, message.id);
    if (attachment) {
      await (supabase.from('chat_attachments' as any) as any).insert({
        message_id: message.id,
        file_url: attachment.file_url,
        file_name: attachment.file_name,
        file_type: attachment.file_type,
        file_size: attachment.file_size,
      });
    }

    dispatch({ type: 'SET_SENDING_MESSAGE', payload: false });
  }, [state.activeChannel, userId, uploadAttachment]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    const { data: attachment } = await supabase
      .from('chat_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .single();

    if (attachment) {
      const filePath = attachment.file_url.split('/chat-files/')[1];
      if (filePath) {
        await supabase.storage.from('chat-files').remove([filePath]);
      }
    }

    await supabase.from('chat_attachments').delete().eq('id', attachmentId);
  }, []);

  // ── Message edit/delete ──
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    await supabase
      .from('chat_messages')
      .update({ message: newText.trim(), updated_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', userId);
  }, [userId]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const { data: attachments } = await supabase
      .from('chat_attachments')
      .select('id')
      .eq('message_id', messageId);

    if (attachments) {
      for (const att of attachments) {
        await deleteAttachment(att.id);
      }
    }

    await supabase.from('chat_messages').delete().eq('id', messageId).eq('sender_id', userId);
  }, [userId, deleteAttachment]);

  // ── Group management ──
  const fetchGroupMembers = useCallback(async (groupId: string) => {
    const { data } = await supabase
      .from('chat_group_members')
      .select(`
        user_id,
        role,
        joined_at,
        profile:profiles!user_id(id, full_name, role)
      `)
      .eq('group_id', groupId);
    return (data || []).map((m: any) => ({
      ...m,
      profile: m.profile ? { ...m.profile, avatar_url: null } : null,
    }));
  }, []);

  const addGroupMember = useCallback(async (groupId: string, userIdToAdd: string) => {
    await supabase
      .from('chat_group_members')
      .insert({ group_id: groupId, user_id: userIdToAdd, role: 'member' });
  }, []);

  const removeGroupMember = useCallback(async (groupId: string, userIdToRemove: string) => {
    await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userIdToRemove);
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    await supabase
      .from('chat_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
  }, [userId]);

  const updateGroupName = useCallback(async (groupId: string, newName: string) => {
    await supabase
      .from('chat_groups')
      .update({ name: newName.trim() })
      .eq('id', groupId);
  }, []);

  const deleteGroup = useCallback(async (groupId: string) => {
    // Delete channel (cascade deletes messages, participants, attachments)
    const { data: channel } = await supabase
      .from('chat_channels')
      .select('id')
      .eq('group_id', groupId)
      .single();

    if (channel) {
      await supabase.from('chat_channels').delete().eq('id', channel.id);
    }

    // Delete group members
    await supabase.from('chat_group_members').delete().eq('group_id', groupId);

    // Delete group
    await supabase.from('chat_groups').delete().eq('id', groupId);
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (channelSubRef.current) supabase.removeChannel(channelSubRef.current);
      if (globalSubRef.current) supabase.removeChannel(globalSubRef.current);
    };
  }, []);

  // ── Fetch channels on mount & userId change ──
  useEffect(() => {
    if (userId) {
      dispatch({ type: 'SET_CHANNELS', payload: [] });
      dispatch({ type: 'SET_ACTIVE_CHANNEL', payload: null });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      fetchChannels();
    }
  }, [userId, fetchChannels]);

  // ── Global realtime listener for unread counts on all channels ──
  useEffect(() => {
    if (!userId) return;

    const globalSub = supabase
      .channel(`global_chat:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const newMsg = payload.new as Message;
          const channelId = newMsg.channel_id;

          if (newMsg.sender_id === userId) return;
          if (state.activeChannel && state.activeChannel.id === channelId) return;

          const { data: participant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('channel_id', channelId)
            .eq('user_id', userId)
            .maybeSingle();

          if (!participant || !newMsg.sender_id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          const senderProfile: Profile = profile
            ? { id: profile.id, full_name: profile.full_name || 'Unknown', role: profile.role || 'staff', avatar_url: null }
            : { id: newMsg.sender_id, full_name: 'Unknown', role: 'staff', avatar_url: null };

          const enriched: Message = {
            ...newMsg,
            sender: senderProfile,
          };

          dispatch({ type: 'UPDATE_CHANNEL_LAST_MESSAGE', payload: { channelId, message: enriched } });
          dispatch({ type: 'INCREMENT_CHANNEL_UNREAD', payload: channelId });
        }
      )
      .subscribe();

    globalSubRef.current = globalSub;

    return () => {
      if (globalSubRef.current) supabase.removeChannel(globalSubRef.current);
    };
  }, [userId, state.activeChannel]);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        typingUsers,
        totalUnread,
        selectChannel,
        sendMessage,
        markAsRead,
        getOrCreateChannel,
        getOrCreateDirectChat,
        createGroup,
        startTyping,
        stopTyping,
        fetchStaffList,
        fetchWOJOContext,
        pinMessage,
        unpinMessage,
        fetchChannels,
        uploadAttachment,
        sendAttachment,
        deleteAttachment,
        editMessage,
        deleteMessage,
        fetchGroupMembers,
        addGroupMember,
        removeGroupMember,
        leaveGroup,
        updateGroupName,
        deleteGroup,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
