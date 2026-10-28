'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Clock, ExternalLink, Loader2, Sparkles, Truck, CheckCircle2, Package, Shield, AlertCircle, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  type: 'wo_assignment' | 'system' | 'handover' | 'general';
  title: string;
  message: string;
  link: string;
  created_at: string;
  is_read: boolean;
}

export default function NotificationBell() {
  const { profile } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = useCallback(async () => {
    if (!profile?.tenant_id) return;
    try {
      const role = (profile.role || '').toLowerCase();
      const tenantId = profile.tenant_id;
      const readWoIds = new Set<string>(JSON.parse(localStorage.getItem(`read_wo_notifs_${profile.id}`) || '[]'));

      const notifList: NotificationItem[] = [];

      // 1. Fetch system notifications from notifications table
      const { data: sysData } = await supabase
        .from('notifications')
        .select('*')
        .or(`role.eq.${profile.role},user_id.eq.${profile.id}`)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(15);

      if (sysData && sysData.length > 0) {
        for (const n of sysData) {
          notifList.push({
            id: n.id,
            type: 'system',
            title: n.title || 'Notifikasi Sistem',
            message: n.message || '',
            link: (n.metadata as any)?.link || '/sbu/trucking/work-orders',
            created_at: n.created_at || new Date().toISOString(),
            is_read: false,
          });
        }
      }

      // 2. For SBU Trucking roles: fetch active wo_items needing assignment
      if (role.includes('tr') || role.includes('truck') || role.includes('ops') || role.includes('manager')) {
        const { data: woData } = await supabase
          .from('wo_items')
          .select(`
            id, item_code, status, sbu_type, created_at, unit_price,
            work_orders!inner(id, wo_number, status, md_entities!customer_id(name, legal_name))
          `)
          .eq('tenant_id', tenantId)
          .eq('sbu_type', 'TRUCKING')
          .in('status', ['need_assignment', 'pending'])
          .order('created_at', { ascending: false })
          .limit(10);

        if (woData && woData.length > 0) {
          for (const item of woData) {
            const notifId = `wo_${item.id}`;
            if (!readWoIds.has(notifId)) {
              const wo = item.work_orders as any;
              const customerName = wo?.md_entities?.legal_name || wo?.md_entities?.name || 'Customer';
              notifList.push({
                id: notifId,
                type: 'wo_assignment',
                title: 'Work Order Perlu Penugasan',
                message: `${wo?.wo_number || 'WO'} • ${item.item_code} (${customerName})`,
                link: `/sbu/trucking/work-orders?status=need_assignment&itemId=${item.id}`,
                created_at: item.created_at || new Date().toISOString(),
                is_read: false,
              });
            }
          }
        }
      }

      // 3. For HQ CS / Admin: fetch handover requests
      if (role.includes('cs') || role.includes('hq') || role.includes('admin') || role.includes('director')) {
        const { data: hoData } = await supabase
          .from('wo_items')
          .select(`
            id, item_code, status, created_at,
            work_orders!inner(id, wo_number, md_entities!customer_id(name))
          `)
          .eq('tenant_id', tenantId)
          .eq('status', 'handover_pending')
          .order('created_at', { ascending: false })
          .limit(10);

        if (hoData && hoData.length > 0) {
          for (const item of hoData) {
            const notifId = `ho_${item.id}`;
            if (!readWoIds.has(notifId)) {
              const wo = item.work_orders as any;
              notifList.push({
                id: notifId,
                type: 'handover',
                title: 'Permintaan Handover SBU',
                message: `WO ${wo?.wo_number} (${item.item_code}) memerlukan persetujuan handover.`,
                link: `/hq/work-orders?status=handover_pending&itemId=${item.id}`,
                created_at: item.created_at || new Date().toISOString(),
                is_read: false,
              });
            }
          }
        }
      }

      // Sort combined by created_at descending
      notifList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(notifList);
    } catch (err) {
      console.error('[NotificationBell] Error fetching notifications:', err);
    }
  }, [profile?.tenant_id, profile?.role, profile?.id]);

  // Initial fetch and Realtime subscription
  useEffect(() => {
    fetchNotifications();

    if (!profile?.tenant_id) return;

    const channel = supabase
      .channel(`notifs-bell-${profile.tenant_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wo_items' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.tenant_id, fetchNotifications]);

  const unreadCount = notifications.length;

  const markAllAsRead = async () => {
    try {
      // Mark system notifications read in DB
      const sysIds = notifications.filter((n) => n.type === 'system').map((n) => n.id);
      if (sysIds.length > 0) {
        await supabase.from('notifications').update({ is_read: true }).in('id', sysIds);
      }

      // Mark WO notifications read in localStorage
      const woIds = notifications.filter((n) => n.type !== 'system').map((n) => n.id);
      if (profile?.id && woIds.length > 0) {
        const current = new Set<string>(JSON.parse(localStorage.getItem(`read_wo_notifs_${profile.id}`) || '[]'));
        woIds.forEach((id) => current.add(id));
        localStorage.setItem(`read_wo_notifs_${profile.id}`, JSON.stringify([...current]));
      }

      setNotifications([]);
    } catch (err) {
      console.error('[NotificationBell] Mark all as read error:', err);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      if (notif.type === 'system') {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
      } else if (profile?.id) {
        const current = new Set<string>(JSON.parse(localStorage.getItem(`read_wo_notifs_${profile.id}`) || '[]'));
        current.add(notif.id);
        localStorage.setItem(`read_wo_notifs_${profile.id}`, JSON.stringify([...current]));
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      setIsOpen(false);
      router.push(notif.link);
    } catch (err) {
      console.error('[NotificationBell] Click error:', err);
      router.push(notif.link);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: localeId });
    } catch {
      return 'Baru saja';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifikasi"
        title="Buka Notifikasi"
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Tandai Semua Dibaca</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tidak ada notifikasi baru
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Seluruh misi dan penugasan telah terpantau.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isWo = n.type === 'wo_assignment';
                const isHandover = n.type === 'handover';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-3 group"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white ${
                        isWo
                          ? 'bg-blue-600 shadow-sm shadow-blue-500/20'
                          : isHandover
                          ? 'bg-amber-500'
                          : 'bg-slate-700'
                      }`}
                    >
                      {isWo ? (
                        <Truck className="w-4 h-4" />
                      ) : isHandover ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                router.push('/sbu/trucking/work-orders');
              }}
              className="w-full py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span>Buka Work Orders SBU</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
