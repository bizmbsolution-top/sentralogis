'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  TrendingUp, Package, Truck, Users, DollarSign, 
  BarChart3, PieChart, Activity, Calendar, Download
} from 'lucide-react';

export default function HQReportingPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    inventory: { totalItems: 0, totalValue: 0, availableItems: 0 },
    inbound: { totalTasks: 0, completedTasks: 0, pendingTasks: 0 },
    outbound: { totalTasks: 0, completedTasks: 0, pendingTasks: 0 },
    movements: { totalMovements: 0, completedMovements: 0 },
    transfers: { totalTransfers: 0, completedTransfers: 0 },
    staff: { totalStaff: 0, activeStaff: 0 },
    financials: { totalRevenue: 0, totalExpenses: 0, netProfit: 0 }
  });

  const [sbuFilter, setSbuFilter] = useState('ALL'); // ALL, TRUCKING, WAREHOUSE, CLEARANCE, FORWARDING

  const fetchReportData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const tId = profile.tenant_id;
      const [
        inventoryRes, inboundRes, outboundRes, movementsRes, 
        transfersRes, staffRes, financialsRes
      ] = await Promise.all([
        // Inventory Report
        supabase.from('wh_inventory')
          .select('id, quantity, reserved_quantity, available_quantity, unit_cost')
          .eq('tenant_id', tId)
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Inbound Tasks (only completed/rejected)
        supabase.from('wh_tasks')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('task_type', ['INBOUND', 'PUTAWAY'])
          .in('status', ['COMPLETED', 'REJECTED'])
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Outbound Tasks (only completed/rejected)
        supabase.from('wh_tasks')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('task_type', ['OUTBOUND', 'PICKING', 'PACKING'])
          .in('status', ['COMPLETED', 'REJECTED'])
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Movements (only completed/rejected)
        supabase.from('wh_inventory_movements')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('status', ['COMPLETED', 'REJECTED'])
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Transfers (only completed/rejected)
        supabase.from('wh_transfer_orders')
          .select('id, status')
          .eq('tenant_id', tId)
          .in('status', ['COMPLETED', 'REJECTED'])
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Staff
        supabase.from('md_warehouse_staff')
          .select('id')
          .eq('tenant_id', tId)
          .eq('is_active', true)
          .eq('sbu_type', sbuFilter === 'ALL' ? 'WAREHOUSE' : sbuFilter.toLowerCase()),
        
        // Financials (simplified - would need actual financial tables)
        { data: [], error: null }
      ]);

      const [inv, inbound, outbound, movements, transfers, staff] = [
        inventoryRes.data || [],
        inboundRes.data || [],
        outboundRes.data || [],
        movementsRes.data || [],
        transfersRes.data || [],
        staffRes.data || []
      ];

      setReportData({
        inventory: {
          totalItems: inv.length,
          totalValue: inv.reduce((sum, item) => sum + (item.unit_cost || 0) * (item.quantity || 0), 0),
          availableItems: inv.filter(item => item.available_quantity > 0).length
        },
        inbound: {
          totalTasks: inbound.length,
          completedTasks: inbound.length,
          pendingTasks: 0
        },
        outbound: {
          totalTasks: outbound.length,
          completedTasks: outbound.length,
          pendingTasks: 0
        },
        movements: {
          totalMovements: movements.length,
          completedMovements: movements.length
        },
        transfers: {
          totalTransfers: transfers.length,
          completedTransfers: transfers.length
        },
        staff: {
          totalStaff: staff.length,
          activeStaff: staff.length
        },
        financials: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0
        }
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase, sbuFilter]);

  useEffect(() => { if (profile) fetchReportData(); }, [profile, fetchReportData, sbuFilter]);

  const statCards = [
    {
      label: 'Inventory Summary',
      value: reportData.inventory.totalItems,
      subvalue: `Available: ${reportData.inventory.availableItems}`, 
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Completed Inbound Tasks',
      value: reportData.inbound.totalTasks,
      subvalue: 'All completed/rejected',
      icon: Truck,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Completed Outbound Tasks',
      value: reportData.outbound.totalTasks,
      subvalue: 'All completed/rejected',
      icon: Truck,
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    },
    {
      label: 'Completed Movements',
      value: reportData.movements.totalMovements,
      subvalue: 'All completed/rejected',
      icon: Activity,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      label: 'Completed Transfers',
      value: reportData.transfers.totalTransfers,
      subvalue: 'All completed/rejected',
      icon: Truck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      label: 'Active Staff',
      value: reportData.staff.totalStaff,
      subvalue: 'Warehouse personnel',
      icon: Users,
      color: 'text-slate-600',
      bg: 'bg-slate-50'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="mt-4 text-slate-600">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HQ Warehouse Reporting</h1>
          <p className="text-slate-500 text-sm mt-1">Enterprise warehouse operations analytics and reports</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSbuFilter('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sbuFilter === 'ALL' 
              ? 'bg-slate-900 text-white' 
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setSbuFilter('TRUCKING')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sbuFilter === 'TRUCKING' 
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
          >
            Trucking
          </button>
          <button
            onClick={() => setSbuFilter('WAREHOUSE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sbuFilter === 'WAREHOUSE' 
              ? 'bg-green-600 text-white' 
              : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            Warehouse
          </button>
          <button
            onClick={() => setSbuFilter('CLEARANCE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sbuFilter === 'CLEARANCE' 
              ? 'bg-amber-600 text-white' 
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
          >
            Clearance
          </button>
          <button
            onClick={() => setSbuFilter('FORWARDING')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sbuFilter === 'FORWARDING' 
              ? 'bg-purple-600 text-white' 
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
          >
            Forwarding
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">{card.value.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="text-xs text-slate-400">{card.subvalue}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Inventory Analytics</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Inventory Items</span>
                <span className="font-medium">{reportData.inventory.totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Available Items</span>
                <span className="font-medium text-green-600">{reportData.inventory.availableItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Inventory Value</span>
                <span className="font-medium">${reportData.inventory.totalValue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">Completed Operations</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Completed Inbound Tasks</span>
                  <span className="text-sm font-medium">{reportData.inbound.totalTasks}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Completed Outbound Tasks</span>
                  <span className="text-sm font-medium">{reportData.outbound.totalTasks}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Completed Movements</span>
                  <span className="text-sm font-medium">{reportData.movements.totalMovements}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Completed Transfers</span>
                  <span className="text-sm font-medium">{reportData.transfers.totalTransfers}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full" 
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900">Export Reports</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
              Export Inventory Report
            </button>
            <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
              Export Task Report
            </button>
            <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors">
              Export Financial Report
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
