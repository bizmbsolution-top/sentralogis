'use client';

import React, { useState } from 'react';
import FleetTypesTable from '@/components/master/FleetTypesTable';
import FleetTypesFormModal from '@/components/master/FleetTypesFormModal';
import { Plus, Truck } from 'lucide-react';

export default function FleetTypesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (type: any) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Fleet Types</h1>
            <p className="text-sm text-slate-500">Manage vehicle categories and capacities</p>
          </div>
        </div>

        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Fleet Type
        </button>
      </div>

      <FleetTypesTable 
        refreshTrigger={refreshTrigger} 
        onEdit={handleEdit} 
      />

      <FleetTypesFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        initialData={editingType}
      />
    </div>
  );
}
