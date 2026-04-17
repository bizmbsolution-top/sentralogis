export const formatThousand = (val: string | number) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export function getStatusConfig(opStatus: string) {
    switch(opStatus) {
        case 'finished': return { label: 'DONE', color: 'text-emerald-300', dot: 'bg-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', stripe: 'bg-emerald-400' };
        case 'on_journey': return { label: 'ON JOURNEY', color: 'text-blue-400', dot: 'bg-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', stripe: 'bg-blue-400' };
        case 'rejected': return { label: 'REJECTED', color: 'text-red-400', dot: 'bg-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', stripe: 'bg-red-500' };
        case 'need_approval': return { label: 'NEED APPROVAL', color: 'text-amber-400', dot: 'bg-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', stripe: 'bg-amber-400' };
        case 'approved': return { label: 'APPROVED', color: 'text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', stripe: 'bg-emerald-500' };
        default: return { label: 'DRAFT', color: 'text-slate-300', dot: 'bg-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-500/30', stripe: 'bg-slate-500' };
    }
}

export function getJOStatusBadge(status: string) {
    switch(status) {
        case 'delivered': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
        case 'delivering': return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
        case 'picking_up': return 'bg-amber-500/20 text-amber-400 border-amber-500/20';
        case 'accepted': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/20';
        default: return 'bg-slate-700/60 text-slate-400 border-white/5';
    }
}

export function getOperationalStatus(item: any): string {
    const status = item.work_orders?.status;
    const assignments = item.assignments || [];
    const assignedCount = assignments.length;
    
    const allDone = assignedCount > 0 && assignments.every((a: any) => a.status === 'delivered');
    if (allDone) return 'finished';
    
    const hasLinkSent = assignments.some((a: any) => a.is_link_sent);
    if (hasLinkSent) return 'on_journey';
    
    if (status === 'rejected') return 'rejected';
    if (status === 'pending_armada_check') return 'need_approval';
    if (status === 'approved') return 'approved';
    return 'draft';
}
