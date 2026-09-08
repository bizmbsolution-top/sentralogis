import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, Clock } from 'lucide-react';

interface ShipmentRiskPanelProps {
  riskAssessment: {
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    eta_variance_hours: number;
    factors: string[];
  };
  eta?: string | null;
}

export const ShipmentRiskPanel: React.FC<ShipmentRiskPanelProps> = ({
  riskAssessment,
  eta
}) => {
  const isHighRisk = riskAssessment.risk_level === 'CRITICAL' || riskAssessment.risk_level === 'HIGH';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ETA & Risk Assessment
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            Operational Risk: <span className={isHighRisk ? 'text-rose-600' : 'text-emerald-600'}>{riskAssessment.risk_level}</span>
          </h3>
        </div>

        <div className={`p-2.5 rounded-xl border ${isHighRisk ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
          {isHighRisk ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
          <span className="text-slate-500">Scheduled Arrival:</span>
          <span className="font-mono font-bold text-slate-800">
            {eta ? new Date(eta).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA'}
          </span>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Risk Factors</span>
          <ul className="space-y-1">
            {riskAssessment.factors.map((f, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-slate-700">
                <span className="text-slate-400">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
