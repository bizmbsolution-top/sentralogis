'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Key, ShieldAlert, CheckCircle2, Clock, Mail, Globe } from 'lucide-react';

export default function ResetRequestsModal({ isOpen, onClose, onRefresh }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reset_password_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen]);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reset_password_requests')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Security Access Reset Authorized');
      fetchRequests();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Security Verification Queue"
      size="xl"
    >
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4">
           <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
           <div className="space-y-1">
              <h4 className="text-sm font-bold text-amber-900 uppercase tracking-widest">Protocol Warning</h4>
              <p className="text-xs font-medium text-amber-700 leading-relaxed">
                Approving a request will authorize the node administrator to initialize a new security key. Verify the identity via secondary channels before authorization.
              </p>
           </div>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster Node</TableHead>
                <TableHead>Identity Link</TableHead>
                <TableHead className="text-center">Protocol Timestamp</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-[0.2em] italic">
                    Syncing Verification Buffer...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-20 text-center text-slate-400">
                    No pending verification requests in the current sector.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                            <Globe className="w-4 h-4 text-slate-400" />
                         </div>
                         <div>
                            <p className="text-sm font-bold text-slate-900">{req.tenant_code}</p>
                            <Badge variant="warning">AWAITING AUTH</Badge>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                         <Mail className="w-3.5 h-3.5 text-slate-400" /> {req.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                             <Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(req.created_at).toLocaleTimeString()}
                          </div>
                          <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{new Date(req.created_at).toLocaleDateString()}</span>
                       </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                        icon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Authorize Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>
    </Modal>
  );
}
