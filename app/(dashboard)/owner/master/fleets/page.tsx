'use client';

import React, { useState } from 'react';
import FleetsTable from '@/components/master/FleetsTable';
import FleetsFormModal from '@/components/master/FleetsFormModal';
import { Plus, Car } from 'lucide-react';

export default function FleetsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFleet, setEditingFleet] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingFleet(null);
    setIsModalOpen(true);
  };

  const handleEdit = (fleet: any) => {
    setEditingFleet(fleet);
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
            <Car size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Master Fleets</h1>
            <p className="text-sm text-slate-500">Manage individual vehicles and compliance</p>
          </div>
        </div>

        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Vehicle
        </button>
      </div>

      <FleetsTable 
        refreshTrigger={refreshTrigger} 
        onEdit={handleEdit} 
      />

      <FleetsFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        initialData={editingFleet}
      />
    </div>
  );
}
