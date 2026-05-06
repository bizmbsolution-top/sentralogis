'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Truck, User, Calendar, MapPin, 
  ExternalLink, Search, Filter, Loader2,
  Clock, CheckCircle2, Navigation
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import AddCostModal from '@/components/sbu/AddCostModal';
import { Plus } from 'lucide-react';

export default function SBUAssignmentsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJO, setSelectedJO] = useState<any>(null);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          md_drivers (name, phone),
          md_fleets (plate_number, vehicle_type:md_fleet_types(type_name)),
          wo_item:wo_item_id (
            item_data,
            wo:work_orders (
              wo_number,
              customer:md_entities (name)
            )
          )
        `)
        .in('status', ['accepted', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned': return <Badge className="bg-slate-100 text-slate-600 border-none">DITUGASKAN</Badge>;
      case 'accepted': return <Badge className="bg-emerald-100 text-emerald-700 border-none">DITERIMA DRIVER</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-700 border-none">DALAM PERJALANAN</Badge>;
      default: return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  const filteredJobs = jobOrders.filter(jo => 
    jo.jo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    jo.md_drivers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    jo.wo_item?.wo?.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Assignments</h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-medium">Monitoring Pekerjaan Berjalan</p>
        </div>
        <Button onClick={fetchAssignments} variant="outline" size="sm" className="gap-2">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />} Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari JO, Driver, atau Customer..." 
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="rounded-xl gap-2">
          <Filter size={18} /> Filter
        </Button>
      </div>

      {loading && jobOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-slate-500 font-medium animate-pulse tracking-widest text-xs">MENGAMBIL DATA ASSIGNMENTS...</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <div className="text-4xl mb-4">🚚</div>
          <h3 className="text-lg font-bold text-slate-800">Tidak ada penugasan aktif</h3>
          <p className="text-slate-500 text-sm">Semua pekerjaan telah selesai atau belum ditugaskan.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((jo) => (
            <Card key={jo.id} className="p-0 overflow-hidden border-slate-200 hover:border-blue-300 transition-all group shadow-sm hover:shadow-md">
              <div className="flex flex-col md:flex-row">
                {/* Status Section */}
                <div className={`md:w-2 px-6 py-4 ${
                  jo.status === 'in_progress' ? 'bg-blue-600' : 
                  jo.status === 'accepted' ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                
                <div className="flex-1 p-6">
                  <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-50 rounded">JO ACTIVE</span>
                        <h3 className="font-black text-slate-900 tracking-tighter">{jo.jo_number}</h3>
                      </div>
                      <p className="text-sm font-bold text-slate-500 uppercase tracking-tight">
                        {jo.wo_item?.wo?.customer?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(jo.status)}
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider italic">
                        Created: {format(new Date(jo.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Driver</p>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{jo.md_drivers?.name || 'N/A'}</p>
                        <p className="text-xs text-slate-400">{jo.driver_phone || jo.md_drivers?.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Truck size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Armada</p>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{jo.md_fleets?.plate_number || 'N/A'}</p>
                        <p className="text-xs text-slate-400">{jo.md_fleets?.vehicle_type?.type_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <MapPin size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Route Preview</p>
                        <p className="text-sm font-black text-slate-700 uppercase tracking-tight truncate max-w-[200px]">
                          {jo.wo_item?.item_data?.shipper_name} → {jo.wo_item?.item_data?.recipient_name}
                        </p>
                        <p className="text-xs text-slate-400">Multi-stop journey</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 flex flex-col justify-center gap-2 border-l border-slate-100">
                  <Link href={`/sbu/trucking/tracking?jo=${jo.jo_number}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 font-bold text-xs uppercase tracking-widest h-11">
                      <Navigation size={14} fill="currentColor" /> Live Track
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl gap-2 font-bold text-xs uppercase tracking-widest h-11 border-slate-200"
                    onClick={() => {
                      setSelectedJO(jo);
                      setIsAddCostOpen(true);
                    }}
                  >
                    <Plus size={14} /> Add Cost
                  </Button>
                  <Button variant="outline" className="w-full rounded-xl gap-2 font-bold text-xs uppercase tracking-widest h-11 border-slate-200">
                    <ExternalLink size={14} /> Detail JO
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODALS */}
      {isAddCostOpen && selectedJO && (
        <AddCostModal
          isOpen={isAddCostOpen}
          onClose={() => {
            setIsAddCostOpen(false);
            setSelectedJO(null);
          }}
          joId={selectedJO.id}
          joNumber={selectedJO.jo_number}
          onSuccess={() => {
            setIsAddCostOpen(false);
            setSelectedJO(null);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
}
