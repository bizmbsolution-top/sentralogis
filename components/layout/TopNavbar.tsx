'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { Menu, LogOut, User as UserIcon, ChevronDown, Bell, Clock, ArrowRight, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

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
  const fetchRef = useRef(false)

  const fetchNotifications = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.role || fetchRef.current) return
    
    fetchRef.current = true
    const roleUpper = profile.role.toUpperCase()
    setLoading(true)
    
    const { data: systemNotifs } = await supabase
      .from('notifications')
      .select('*')
      .or(`role.eq.${profile.role},user_id.eq.${profile.id}`)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(20)

    let legacyNotifs: any[] = []
    if (roleUpper.includes('HQ') || roleUpper.includes('ADMIN') || roleUpper.includes('CS')) {
      const { data, error } = await supabase
        .from('wo_items')
        .select('id, item_code, status, item_data, work_orders!inner(wo_number)')
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'handover_pending')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        legacyNotifs = data
          .filter((n) => !(n.item_data?.read_by || []).includes(profile.id))
          .map((n) => ({
            id: `wo_${n.id}`,
            type: 'handover',
            title: 'Handover Request',
            message: `New handover for ${n.item_code}`,
            link: `/hq/work-orders?status=handover_pending&itemId=${n.id}`,
            created_at: n.created_at,
          }))
      }
    } else if (roleUpper.includes('SBU') || roleUpper.includes('OPS') || roleUpper.includes('MANAGER')) {
      const { data, error } = await supabase
        .from('wo_items')
        .select('id, item_code, status, item_data, work_orders!inner(wo_number)')
        .eq('tenant_id', profile.tenant_id)
        .in('status', ['handover_rejected', 'pending', 'need_assignment'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        legacyNotifs = data
          .filter((n) => !(n.item_data?.read_by || []).includes(profile.id))
          .map((n) => ({
            id: `wo_${n.id}`,
            type: n.status === 'handover_rejected' ? 'rejected' : 'assignment',
            title: n.status === 'handover_rejected' ? 'Handover Rejected' : 'New Assignment',
            message: `${n.work_orders?.wo_number} - ${n.item_code}`,
            link: `/sbu/trucking/work-orders?status=${n.status}&itemId=${n.id}`,
            created_at: n.created_at,
          }))
      }
    }

    let completedJoNotifs: any[] = []
    const { data: acks } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('user_id', profile.id)
      .eq('title', 'MISSION_ACK')
    
    const ackedJoIds = (acks || []).map((a: any) => a.metadata?.jo_id).filter(Boolean)

    let joQuery = supabase
      .from('job_orders')
      .select('id, jo_number, status, created_at')
      .eq('tenant_id', profile.tenant_id)
      .in('status', ['SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI'])
    
    if (ackedJoIds.length > 0) {
      const quotedIds = ackedJoIds.map((id: string) => `'${id}'`).join(',')
      joQuery = joQuery.not('id', 'in', `(${quotedIds})`)
    }

    const { data: completedJos, error: joError } = await joQuery
      .order('created_at', { ascending: false })
      .limit(10)

    if (!joError && completedJos) {
      completedJoNotifs = completedJos.map((jo) => ({
        id: `jo_${jo.id}`,
        type: 'jo_completed',
        title: 'Mission Completed',
        message: `${jo.jo_number} is ready for docs & audit`,
        link: roleUpper.includes('HQ')
          ? `/hq/job-orders?q=${jo.jo_number}`
          : `/sbu/trucking/completed?jo=${jo.jo_number}`,
        created_at: jo.created_at,
      }))
    }

    const allNotifs = [...(systemNotifs || []), ...legacyNotifs, ...completedJoNotifs]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20)

    setNotifications(allNotifs)
    setLoading(false)
    fetchRef.current = false
  }, [profile?.tenant_id, profile?.role, profile?.id])

  useEffect(() => {
    if (!profile?.tenant_id || !profile?.role) return
    
    fetchNotifications()
    
    const systemChannel = supabase
      .channel('system-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications()
      })
      .subscribe()

    const woChannel = supabase
      .channel('handover-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wo_items', filter: `tenant_id=eq.${profile?.tenant_id}` }, () => {
        fetchNotifications()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(systemChannel)
      supabase.removeChannel(woChannel)
    }
  }, [profile?.tenant_id, profile?.role, fetchNotifications])

  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return
    setNotifications([])
    
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile.id).eq('is_read', false)

      const woIds = notifications.filter((n) => n.type === 'handover' || n.type === 'rejected' || n.type === 'assignment').map((n) => n.id.replace('wo_', ''))
      
      for (const itemId of woIds) {
        const { data: currentItem } = await supabase.from('wo_items').select('item_data').eq('id', itemId).single()
        const currentReadBy = currentItem?.item_data?.read_by || []
        if (!currentReadBy.includes(profile.id)) {
          await supabase.from('wo_items').update({ item_data: { ...currentItem?.item_data, read_by: [...currentReadBy, profile.id] } }).eq('id', itemId)
        }
      }

      const joIds = notifications.filter((n) => n.type === 'jo_completed').map((n) => n.id.replace('jo_', ''))
      for (const joId of joIds) {
        await supabase.from('notifications').insert({ tenant_id: profile.tenant_id, user_id: profile.id, title: 'MISSION_ACK', message: `ACK for JO ${joId}`, metadata: { jo_id: joId }, is_read: true, role: profile.role })
      }

      toast.success('All notifications marked as read')
    } catch (err) {
      console.error('[TopNavbar] Failed to mark all as read:', err)
      toast.error('Failed to clear notifications')
      fetchNotifications()
    }
  }

  const handleNotificationClick = async (n: any) => {
    const targetLink = n.link || n.metadata?.link
    setNotifications((prev) => prev.filter((item) => item.id !== n.id))
    setShowNotifications(false)
    
    try {
      if (n.type === 'handover' || n.type === 'rejected' || n.type === 'assignment') {
        const itemId = n.id.replace('wo_', '')
        const { data: currentItem } = await supabase.from('wo_items').select('item_data').eq('id', itemId).single()
        const currentReadBy = currentItem?.item_data?.read_by || []
        if (!currentReadBy.includes(profile?.id)) {
          await supabase.from('wo_items').update({ item_data: { ...currentItem?.item_data, read_by: [...currentReadBy, profile?.id] } }).eq('id', itemId)
        }
      } else if (n.type === 'jo_completed') {
        const joId = n.id.replace('jo_', '')
        await supabase.from('notifications').insert({ tenant_id: profile?.tenant_id, user_id: profile?.id, title: 'MISSION_ACK', message: `ACK for JO ${joId}`, metadata: { jo_id: joId }, is_read: true, role: profile?.role })
      } else {
        await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      }
    } catch (err) {
      console.error('[TopNavbar] Failed to mark as read:', err)
    }

    if (targetLink) router.push(targetLink)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'handover': return '📋'
      case 'rejected': return '⚠️'
      case 'assignment': return '🚛'
      case 'jo_completed': return '✅'
      default: return '🔔'
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg lg:hidden">
            <Menu size={20} />
          </button>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">System Online</span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Powered by Sentralogis</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors group">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              {notifications.length > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] bg-rose-600 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center px-1 shadow-sm">
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                  <span className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] bg-rose-600 rounded-full animate-ping opacity-20" />
                </>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute right-0 mt-2 w-[480px] sm:w-[520px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide leading-none">Notifications</h3>
                      <span className="text-[10px] font-bold text-rose-600 mt-1 block uppercase tracking-tight">{notifications.length} NEW</span>
                    </div>
                    {notifications.length > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); handleMarkAllAsRead() }} className="text-[10px] font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2">
                        <XCircle size={14} /> Mark All Read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-[560px] overflow-y-auto">
                    {loading ? (
                      <div className="py-16 text-center">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="py-16 text-center space-y-3">
                        <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                          <Bell size={28} />
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">No new notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {notifications.map((n) => (
                          <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-5 hover:bg-slate-50 transition-colors group/item cursor-pointer border-l-4 border-transparent hover:border-slate-900">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{getNotifIcon(n.type)}</span>
                                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">{n.title}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-600 line-clamp-2">{n.message}</p>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-tight pt-1 text-slate-400">
                                  <Clock size={12} />
                                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </div>
                              </div>
                              <div className="p-2 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all shadow-lg bg-slate-900 shadow-slate-900/20 text-white shrink-0">
                                <ArrowRight size={14} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <button onClick={() => { setShowNotifications(false); router.push(profile?.role?.toUpperCase().includes('HQ') ? '/hq/work-orders?status=handover_pending' : '/sbu/trucking/work-orders') }} className="w-full p-4 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide hover:bg-slate-100 transition-colors border-t border-slate-100">
                      View All Notifications
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="h-8 w-px bg-slate-100 hidden md:block" />

          <div className="relative">
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-colors focus:outline-none">
              <div className="flex items-center gap-3 pr-2">
                <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-semibold">{initials}</div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900 leading-none">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{profile?.role?.replace('_', ' ') || 'Member'}</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 overflow-hidden">
                  <button onClick={() => { setDropdownOpen(false); router.push('/tenant/profile') }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <UserIcon size={16} /> Profile Settings
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut size={16} /> Logout
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
