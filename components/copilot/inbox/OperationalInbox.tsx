'use client';

import React, { useState, useMemo } from 'react';
import InboxCategoryTabs from './InboxCategoryTabs';
import OperationalInboxSearch from './OperationalInboxSearch';
import OperationalInboxFilter from './OperationalInboxFilter';
import OperationalInboxCard, { InboxItem } from './OperationalInboxCard';

export interface OperationalInboxProps {
  onSelectItem: (item: InboxItem) => void;
  selectedItemId?: string;
}

const MOCK_ITEMS: InboxItem[] = [
  { id: 'INB-001', category: 'delayed', title: 'JO-2401 Delayed 3h', subtitle: 'PT Berkah Abadi → Surabaya', priority: 'HIGH', timestamp: '15m ago', metadata: { driver: 'Anton', eta_delay: '3 hours' }, isRead: false },
  { id: 'INB-002', category: 'driver_sos', title: 'Driver SOS Alert', subtitle: 'Budi - B 1234 CD (Tol Cikampek)', priority: 'CRITICAL', timestamp: '2m ago', metadata: { location: 'Tol Cikampek KM 45' }, isRead: false },
  { id: 'INB-003', category: 'waiting_pod', title: 'JO-2398 Missing POD', subtitle: 'Global Logistik - Delivered 2d ago', priority: 'MEDIUM', timestamp: '2h ago', metadata: {}, isRead: true },
  { id: 'INB-004', category: 'whatsapp', title: 'New WA: Driver Confirmation', subtitle: '+62812xxx - "Sudah sampai gudang"', priority: 'LOW', timestamp: '5m ago', metadata: {}, isRead: false },
  { id: 'INB-005', category: 'ai_suggestion', title: 'Reassign JO-2405', subtitle: 'Driver Andi unavailable, suggest Candra', priority: 'MEDIUM', timestamp: '1m ago', metadata: { confidence: '87%' }, isRead: true },
  { id: 'INB-006', category: 'waiting_driver', title: 'JO-2410 No Driver', subtitle: 'PT Maju Jaya → Jakarta', priority: 'HIGH', timestamp: '30m ago', metadata: {}, isRead: true },
  { id: 'INB-007', category: 'missing_container', title: 'TGHU7654321 Not Tracked', subtitle: 'Consol FWD-098 - Last seen Tg. Priok', priority: 'HIGH', timestamp: '1h ago', metadata: {}, isRead: true },
  { id: 'INB-008', category: 'delayed', title: 'JO-2420 Stuck in Traffic', subtitle: 'PT Jaya Sentosa → Bandung', priority: 'MEDIUM', timestamp: '45m ago', metadata: { status: 'stuck' }, isRead: false },
  { id: 'INB-009', category: 'driver_sos', title: 'Vehicle Breakdown Alert', subtitle: 'Candra - B 9876 EF (Pantura)', priority: 'CRITICAL', timestamp: '10m ago', metadata: { reason: 'engine' }, isRead: false },
  { id: 'INB-010', category: 'waiting_pod', title: 'JO-2350 Overdue POD', subtitle: 'Cipta Cargo - Delivered 5d ago', priority: 'HIGH', timestamp: '1d ago', metadata: {}, isRead: true },
  { id: 'INB-011', category: 'whatsapp', title: 'New WA: Customer Query', subtitle: '+62819xxx - "Posisi truk dimana?"', priority: 'MEDIUM', timestamp: '8m ago', metadata: { sbu: 'trucking' }, isRead: false },
  { id: 'INB-012', category: 'ai_suggestion', title: 'Optimize Route R-99', subtitle: 'Save 45 mins by rerouting via Tol Cipali', priority: 'LOW', timestamp: '12m ago', metadata: { savings: '45m' }, isRead: true },
];

export default function OperationalInbox({ onSelectItem, selectedItemId }: OperationalInboxProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sbuFilter, setSbuFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
      // Category filter
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!item.title.toLowerCase().includes(query) && !item.subtitle.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      
      // SBU Filter (mock implementation)
      if (sbuFilter !== 'all') {
        const metadataSbu = item.metadata.sbu;
        if (metadataSbu && metadataSbu !== sbuFilter) return false;
      }
      
      return true;
    });
  }, [searchQuery, activeCategory, sbuFilter, priorityFilter]);

  const categories = useMemo(() => {
    const counts = MOCK_ITEMS.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { key: 'all', label: 'All', count: MOCK_ITEMS.length },
      { key: 'delayed', label: 'Delayed Jobs', count: counts.delayed || 0 },
      { key: 'waiting_driver', label: 'Waiting Driver', count: counts.waiting_driver || 0 },
      { key: 'waiting_pod', label: 'Waiting POD', count: counts.waiting_pod || 0 },
      { key: 'driver_sos', label: 'Driver SOS', count: counts.driver_sos || 0 },
      { key: 'missing_container', label: 'Missing Container', count: counts.missing_container || 0 },
      { key: 'whatsapp', label: 'WhatsApp', count: counts.whatsapp || 0 },
      { key: 'ai_suggestion', label: 'AI Suggestions', count: counts.ai_suggestion || 0 },
    ];
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 max-h-screen">
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm z-10">
        <h2 className="text-base font-semibold text-slate-900">Operational Inbox</h2>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-100">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Tools */}
      <div className="p-4 flex flex-col gap-3 bg-white border-b border-slate-200 z-10">
        <OperationalInboxSearch value={searchQuery} onChange={setSearchQuery} />
        <OperationalInboxFilter 
          sbuFilter={sbuFilter} 
          priorityFilter={priorityFilter}
          onSbuChange={setSbuFilter}
          onPriorityChange={setPriorityFilter}
        />
      </div>

      {/* Tabs */}
      <div className="z-10 bg-white">
        <InboxCategoryTabs 
          categories={categories} 
          activeCategory={activeCategory} 
          onSelect={setActiveCategory} 
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length > 0 ? (
          filteredItems.map(item => (
            <OperationalInboxCard 
              key={item.id} 
              item={item} 
              isSelected={selectedItemId === item.id} 
              onClick={onSelectItem} 
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm font-medium text-slate-500">No items found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
