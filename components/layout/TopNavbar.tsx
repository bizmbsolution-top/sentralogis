'use client'

import React, { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Menu, LogOut, User as UserIcon, ChevronDown, Bell, Clock, ArrowRight, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

interface TopNavbarProps {
  onMenuClick: () => void
}

const TopNavbar = ({ onMenuClick }: TopNavbarProps) => {
  const { profile, logout } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const fetchNotifications = React.useCallback(async () => {
    if (!profile?.tenant_id || !profile?.role) {
      console.log('[Notifications] Missing profile info:', { tenant: !!profile?.tenant_id, role: !!profile?.role });
      return;
    }
    
    const roleUpper = profile.role.toUpperCase();
    console.log('[Notifications] Fetching for role:', roleUpper);

    setLoading(true)
    
    // 1. Fetch System Notifications from 'notifications' table
    const { data: systemNotifs, error: sysError } = await supabase
      .from('notifications')
      .select('*')
      .or(`role.eq.${profile.role},user_id.eq.${profile.id}`)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    // 2. Fetch Legacy WO Notifications
    let legacyNotifs: any[] = [];
    if (roleUpper.includes('HQ') || roleUpper.includes('ADMIN') || roleUpper.includes('CS')) {
      const { data, error } = await supabase
        .from('wo_items')
        .select('id, item_code, status, item_data, work_orders!inner(wo_number)')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'handover_pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        legacyNotifs = data.filter(n => !(n.item_data?.read_by || []).includes(profile.id))
          .map(n => ({
            id: n.id,
            title: 'Handover Request',
            message: `New handover for ${n.item_code}`,
            link: `/hq/work-orders?status=handover_pending&itemId=${n.id}`,
            is_legacy: true,
            created_at: n.created_at
          }));
      }
    } else if (roleUpper.includes('SBU') || roleUpper.includes('OPS') || roleUpper.includes('MANAGER')) {
      const { data, error } = await supabase
        .from('wo_items')
        .select('id, item_code, status, item_data, work_orders!inner(wo_number)')
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['handover_rejected', 'pending'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        legacyNotifs = data.filter(n => !(n.item_data?.read_by || []).includes(profile.id))
          .map(n => ({
            id: n.id,
            title: n.status === 'handover_rejected' ? 'Handover Rejected' : 'New Assignment',
            message: `${n.work_orders?.wo_number} - ${n.item_code}`,
            link: `/sbu/trucking/work-orders?status=${n.status}&itemId=${n.id}`,
            is_legacy: true,
            created_at: n.created_at
          }));
      }
    }

    setNotifications([...(systemNotifs || []), ...legacyNotifs]);
    setLoading(false)
  }, [profile?.tenant_id, profile?.role])

  React.useEffect(() => {
    fetchNotifications()
    
    // Set up real-time subscription for system notifications
    const systemChannel = supabase
      .channel('system-notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications'
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    // Set up real-time subscription for WO items
    const woChannel = supabase
      .channel('handover-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'wo_items',
        filter: `tenant_id=eq.${profile?.tenant_id}`
      }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(systemChannel)
      supabase.removeChannel(woChannel)
    }
  }, [profile?.tenant_id, fetchNotifications])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
              System Online
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors group"
            >
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-[1rem] bg-rose-500 border-2 border-white rounded-full text-[8px] font-black text-white flex items-center justify-center px-0.5">
                    {notifications.length}
                  </span>
                  <span className="absolute top-1.5 right-1.5 h-4 min-w-[1rem] bg-rose-500 rounded-full animate-ping opacity-20" />
                </>
              )}
            </button>

            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      {profile?.role?.toUpperCase().includes('HQ') ? 'Incoming Handovers' : 'Operational Alerts'}
                    </h3>
                    <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">{notifications.length} NEW</span>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto">
                    {loading ? (
                      <div className="py-12 text-center">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                          <Bell size={24} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No new notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={async () => {
                              setShowNotifications(false);
                              
                              if (n.is_legacy) {
                                // Legacy logic for wo_items
                                const { data: currentItem } = await supabase.from('wo_items').select('item_data').eq('id', n.id).single();
                                const currentReadBy = currentItem?.item_data?.read_by || [];
                                if (!currentReadBy.includes(profile?.id)) {
                                  await supabase.from('wo_items').update({
                                    item_data: {
                                      ...currentItem?.item_data,
                                      read_by: [...currentReadBy, profile?.id]
                                    }
                                  }).eq('id', n.id);
                                }
                              } else {
                                // New system notifications
                                await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                              }

                              if (n.link) {
                                router.push(n.link);
                              }
                              fetchNotifications();
                            }}
                            className="p-4 hover:bg-slate-50 transition-colors group/item cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{n.title}</span>
                                  {!n.is_legacy && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                </div>
                                <p className="text-[11px] font-bold text-slate-600 line-clamp-2">
                                  {n.message}
                                </p>
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tight pt-1 text-slate-400">
                                   <Clock size={10} />
                                   {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all shadow-lg bg-slate-900 shadow-slate-900/20 text-white">
                                <ArrowRight size={14} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => {
                        setShowNotifications(false);
                        const path = profile?.role?.toUpperCase().includes('HQ') 
                          ? '/hq/work-orders?status=handover_pending' 
                          : '/sbu/trucking/work-orders';
                        router.push(path);
                      }}
                      className="w-full p-3 bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-colors border-t border-slate-100"
                    >
                      {profile?.role?.toUpperCase().includes('HQ') ? 'View All Handover Requests' : 'Manage Work Orders'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-slate-100 hidden md:block" />

          <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-colors focus:outline-none"
          >
            <div className="flex items-center gap-3 pr-2">
              <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-none">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 mt-1 capitalize">
                  {profile?.role?.replace('_', ' ') || 'Member'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    router.push('/profile')
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <UserIcon size={16} />
                  Profile Settings
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </header>
  )
}

export default TopNavbar
