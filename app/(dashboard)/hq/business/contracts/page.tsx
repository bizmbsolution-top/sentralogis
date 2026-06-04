import React from 'react';
import Link from 'next/link';
import { Plus, Search, Building, Truck, Ship, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getWarehouseContracts } from '@/lib/actions/contractActions';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';

export const metadata = {
  title: 'Commercial Contracts | Sentralogis',
};

export default async function ContractsPage() {
  const supabase = createClient(cookies());
  const { data: user } = await supabase.auth.getUser();
  const tenantId = user?.user?.user_metadata?.tenant_id;

  const warehouseContracts = tenantId ? await getWarehouseContracts(tenantId) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-blue-600" />
            Commercial Contracts
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage B2B contracts, pricing, and SLAs across all SBUs.</p>
        </div>
        
        <Link 
          href="/hq/business/contracts/new"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Create New Contract
        </Link>
      </div>

      {/* SBU Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-white text-slate-700 font-medium text-sm rounded-lg border border-slate-200 shadow-sm whitespace-nowrap hover:bg-slate-50">
            All Contracts
          </button>
          <button className="px-4 py-2 bg-blue-50 text-blue-700 font-medium text-sm rounded-lg border border-blue-200 shadow-sm whitespace-nowrap flex items-center gap-2">
            <Building size={16} />
            Warehouse
          </button>
          <button className="px-4 py-2 bg-white text-slate-600 font-medium text-sm rounded-lg border border-slate-200 whitespace-nowrap hover:bg-slate-50 flex items-center gap-2">
            <Truck size={16} />
            Trucking
          </button>
          <button className="px-4 py-2 bg-white text-slate-600 font-medium text-sm rounded-lg border border-slate-200 whitespace-nowrap hover:bg-slate-50 flex items-center gap-2">
            <Ship size={16} />
            Forwarding
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search contracts..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Contract No.</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">SBU</th>
                <th className="px-4 py-3">Validity Period</th>
                <th className="px-4 py-3">Commitment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No warehouse contracts found.
                  </td>
                </tr>
              ) : (
                warehouseContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {contract.contract_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{contract.md_entities?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{contract.md_entities?.code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Building size={12} />
                        Warehouse
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{new Date(contract.start_date).toLocaleDateString()}</div>
                      <div className="text-xs text-slate-500">to {new Date(contract.end_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {contract.committed_space ? contract.committed_space.toLocaleString() : '0'} {contract.uom_space}
                      </div>
                      <div className="text-xs text-slate-500">{contract.billing_method}</div>
                    </td>
                    <td className="px-4 py-3">
                      {contract.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-100">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                      {contract.status === 'DRAFT' && (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                          <Clock size={12} /> Draft
                        </span>
                      )}
                      {contract.status === 'EXPIRED' && (
                        <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-medium border border-rose-100">
                          <AlertTriangle size={12} /> Expired
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
