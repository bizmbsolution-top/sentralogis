'use client';

import React, { useState } from 'react';
import DriversTable from '@/components/master/DriversTable';
import DriversFormModal from '@/components/master/DriversFormModal';
import { Plus, User } from 'lucide-react';

export default function DriversPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingDriver(null);
    setIsModalOpen(true);
  };

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
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
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Master Drivers</h1>
            <p className="text-sm text-slate-500">Manage drivers and license compliance</p>
          </div>
        </div>

        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      <DriversTable 
        refreshTrigger={refreshTrigger} 
        onEdit={handleEdit} 
      />

      <DriversFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        initialData={editingDriver}
      />
    </div>
  );
}
