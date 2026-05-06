'use client';

import { useState, useEffect } from 'react';
import { getPendingTopupRequests } from '@/lib/actions/tenantActions';
import { 
  Coins, Loader2, 
  Clock, CheckCircle2, 
  AlertCircle, ExternalLink
} from 'lucide-react';
import TopupModal from '@/components/Owner/TopupModal';
import toast, { Toaster } from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function OwnerTopupPage() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isTopupOpen, setIsTopupOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rData = await getPendingTopupRequests();
      setPendingRequests(rData || []);
    } catch (err) {
      toast.error("Registry Sync Failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-10 animate-slide-up">
      <Toaster position="top-right" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Settlement Center</h1>
          <p className="text-sm font-medium text-slate-500">Authorize and manage token liquidity across the node network.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
              <Coins className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">Protocol A-SETTLE Active</span>
           </div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 ml-2">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest italic">Pending Verification Queue</h3>
          {pendingRequests.length > 0 && (
            <Badge variant="warning" className="animate-pulse">{pendingRequests.length} ACTION REQUIRED</Badge>
          )}
        </div>

        {pendingRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingRequests.map((req, i) => (
              <Card key={req.id || `pending-${i}`} className="border-amber-100 bg-amber-50/30 group hover:border-amber-300 transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Settlement Request</p>
                      <h4 className="text-base font-bold text-slate-900">{req.name}</h4>
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{req.tenant_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 italic">{req.amount?.toLocaleString()} <span className="text-[10px] text-slate-400">TKN</span></p>
                      <p className="text-xs font-bold text-blue-600">Rp {req.total_price?.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-4 border-t border-amber-100">
                    <Button 
                      size="sm" 
                      className="w-full bg-amber-500 hover:bg-amber-600 border-none"
                      onClick={() => { 
                        setSelectedRequest({
                          ...req,
                          requestId: req.id,
                          requestAmount: req.amount,
                          requestPrice: req.total_price
                        }); 
                        setIsTopupOpen(true); 
                      }}
                    >
                      Process Verification
                    </Button>
                    <a 
                      href={req.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white border border-amber-200 text-amber-600 rounded-lg hover:bg-amber-50 transition-all"
                      title="View Proof"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-transparent border-slate-200">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verification Queue Empty</p>
              <p className="text-xs font-medium text-slate-500 mt-1">All node settlements have been processed.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <TopupModal 
        isOpen={isTopupOpen}
        onClose={() => { setIsTopupOpen(false); setSelectedRequest(null); }}
        onRefresh={fetchData}
        tenant={selectedRequest}
      />
    </div>
  );
}
