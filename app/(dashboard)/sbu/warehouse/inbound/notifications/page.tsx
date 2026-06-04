'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  MessageSquare, Search, Filter, Loader2, CheckCircle2, XCircle,
  Clock, RefreshCw, ChevronLeft, ChevronRight, Download, AlertTriangle
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  TRUCK_ARRIVED: 'Truk Tiba',
  UNLOADING_START: 'Bongkar Mulai',
  UNLOADING_STOP: 'Bongkar Berhenti',
  CHECKING_DONE: 'Checking Selesai',
  PUTAWAY_START: 'Putaway Mulai',
  COMPLETED: 'Selesai',
  DAMAGE_ALERT: 'Alert Kerusakan',
  OTHER: 'Lainnya',
};

const TYPE_ICONS: Record<string, any> = {
  TRUCK_ARRIVED: '🚛',
  UNLOADING_START: '⏱',
  UNLOADING_STOP: '⏸',
  CHECKING_DONE: '✅',
  PUTAWAY_START: '📦',
  COMPLETED: '🎉',
  DAMAGE_ALERT: '⚠️',
};

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function WANotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const pageSize = 20;

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('wh_wa_notifications')
        .select('*', { count: 'exact' })
        .order('sent_at', { ascending: false });

      if (typeFilter !== 'ALL') query = query.eq('message_type', typeFilter);
      if (statusFilter !== 'ALL') query = query.eq('status', statusFilter);

      const { data, count, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      setNotifications(data || []);
      setTotal(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, [page, typeFilter, statusFilter]);

  const filtered = notifications.filter(n =>
    !search || n.receipt_number?.toLowerCase().includes(search.toLowerCase()) ||
    n.recipient_name?.toLowerCase().includes(search.toLowerCase()) ||
    n.message_body?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <MessageSquare size={28} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Riwayat WA Notifikasi
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  History pengiriman WhatsApp untuk proses inbound
                </p>
              </div>
            </div>
            <Button onClick={fetchNotifications} loading={loading} className="!bg-slate-800 dark:!bg-slate-700 hover:!bg-slate-700 dark:hover:!bg-slate-600 !text-white !px-4 !py-2 !text-sm !rounded-xl !font-bold">
              <RefreshCw size={16} className="mr-2" /> Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari receipt, penerima, atau isi pesan..."
                className="w-full h-10 pl-9 pr-3 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <select
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }}
              className="h-10 px-3 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-white font-bold"
            >
              <option value="ALL">Semua Tipe</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
              className="h-10 px-3 text-sm bg-slate-100 dark:bg-slate-800 border-0 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 dark:text-white font-bold"
            >
              <option value="ALL">Semua Status</option>
              <option value="SENT">Terkirim ✓</option>
              <option value="FAILED">Gagal ✗</option>
              <option value="PENDING">Pending ⏳</option>
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Terkirim', value: notifications.filter(n => n.status === 'SENT').length, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle2 },
            { label: 'Gagal', value: notifications.filter(n => n.status === 'FAILED').length, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: XCircle },
            { label: 'Hari Ini', value: notifications.filter(n => new Date(n.sent_at).toDateString() === new Date().toDateString()).length, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-2xl p-5 flex items-center gap-4`}>
              <div className={`${stat.color}`}>
                <stat.icon size={32} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-slate-300 dark:text-slate-600" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <MessageSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <p className="text-lg font-bold text-slate-400 dark:text-slate-500">
              Belum ada notifikasi WhatsApp
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Notifikasi akan muncul saat ada perubahan status inbound receipt.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => setSelectedNotif(selectedNotif?.id === notif.id ? null : notif)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-all active:scale-[0.99]"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl mt-0.5 shrink-0">
                        {TYPE_ICONS[notif.message_type] || '📨'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {TYPE_LABELS[notif.message_type] || notif.message_type}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${STATUS_STYLES[notif.status] || ''}`}>
                            {notif.status === 'SENT' ? 'Terkirim' : notif.status === 'FAILED' ? 'Gagal' : 'Pending'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            #{notif.receipt_number || '-'}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {notif.recipient_name || notif.recipient || '-'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {format(new Date(notif.sent_at), 'dd MMM yyyy HH:mm', { locale: id })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {notif.status === 'FAILED' && (
                      <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Message body (expandable) */}
                  {selectedNotif?.id === notif.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                        {notif.message_body}
                      </pre>
                      {notif.error_message && (
                        <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-sm text-rose-600 dark:text-rose-400 font-semibold">
                          ❌ Error: {notif.error_message}
                        </div>
                      )}
                      <div className="mt-3 text-xs text-slate-400 dark:text-slate-500 font-mono">
                        ID: {notif.id}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {total} notifikasi
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300 px-3">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
