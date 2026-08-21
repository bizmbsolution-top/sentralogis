'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Bell, Calendar as CalendarIcon, MessageSquare, Plus, Clock, MapPin, ChevronRight, Briefcase } from 'lucide-react';
import { format, isToday } from 'date-fns';
import Link from 'next/link';

export default function MobileDashboard() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch Today's Meetings
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data: meetings } = await supabase
        .from('crm_activities')
        .select(`id, activity_date, status, description, md_entities(name)`)
        .eq('activity_type', 'MEETING')
        .eq('performed_by', user?.id || '')
        .gte('activity_date', startOfDay.toISOString())
        .lte('activity_date', endOfDay.toISOString())
        .order('activity_date', { ascending: true });

      setTodayMeetings(meetings || []);

      // 2. Mock Unread Chats Count (Fetching active guest chats for this sales rep's leads)
      // Since we don't have read receipts, we'll just show active channels count
      const { count } = await supabase
        .from('md_entities')
        .select('id', { count: 'exact', head: true })
        .eq('sales_rep_id', user?.id || '')
        .eq('crm_status', 'NEW'); // Example metric

      setUnreadChatsCount(count || 0);

    } catch (err: any) {
      console.warn("Error fetching mobile dashboard:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      
      {/* Header */}
      <div className="bg-indigo-600 px-6 pt-8 pb-20 rounded-b-[40px] text-white shadow-md relative">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-6 brightness-0 invert" />
              <span className="text-[9px] text-indigo-200 mt-1 opacity-80">powered by Sentralogis.com</span>
            </div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Good Morning,</p>
            <h1 className="text-2xl font-bold">{profile?.full_name?.split(' ')[0] || 'Sales'}</h1>
          </div>
          <button className="w-10 h-10 rounded-full bg-indigo-500/50 flex items-center justify-center relative">
            <Bell className="w-5 h-5 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-indigo-600"></span>
          </button>
        </div>
      </div>

      {/* Quick Stats Overlay */}
      <div className="px-6 -mt-12 relative z-10">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-100 flex gap-4">
          <Link href="/portal/sales/schedule" className="flex-1 bg-blue-50 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-transform active:scale-95">
            <CalendarIcon className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-xl font-black text-slate-800">{todayMeetings.length}</span>
            <span className="text-xs font-semibold text-slate-500 mt-1">Meetings Today</span>
          </Link>
          <Link href="/portal/sales/chat" className="flex-1 bg-amber-50 rounded-xl p-4 flex flex-col items-center justify-center text-center transition-transform active:scale-95">
            <MessageSquare className="w-6 h-6 text-amber-600 mb-2" />
            <span className="text-xl font-black text-slate-800">{unreadChatsCount}</span>
            <span className="text-xs font-semibold text-slate-500 mt-1">New Leads</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-8">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <Link href="/portal/sales/leads" className="flex-1 bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 transition-transform active:scale-95">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Add Prospect</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Input new lead</p>
            </div>
          </Link>
          <Link href="/portal/sales/deals" className="flex-1 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-3 transition-transform active:scale-95">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Pipeline</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Manage deals</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Today's Agenda */}
      <div className="px-6 flex-1 pb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Today's Agenda</h3>
          <Link href="/portal/sales/schedule" className="text-xs font-bold text-indigo-600">See All</Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-6 text-slate-400 text-sm font-medium">Loading agenda...</div>
          ) : todayMeetings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-medium">No meetings scheduled for today.</p>
            </div>
          ) : (
            todayMeetings.map((meeting) => {
              const entityName = Array.isArray(meeting.md_entities) ? meeting.md_entities[0]?.name : (meeting.md_entities as any)?.name;
              const isDone = meeting.status === 'COMPLETED';
              
              return (
                <Link key={meeting.id} href="/portal/sales/schedule" className="block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded text-xs font-bold w-fit">
                      <Clock className="w-3 h-3" />
                      {format(new Date(meeting.activity_date), 'HH:mm')}
                    </div>
                    {isDone && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">DONE</span>}
                  </div>
                  <h4 className={`font-bold text-slate-800 mb-1 ${isDone ? 'line-through text-slate-400' : ''}`}>{entityName}</h4>
                  <p className="text-xs text-slate-500 line-clamp-1">{(meeting.description || '').split('===')[0]}</p>
                </Link>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
