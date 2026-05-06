'use client';

import React, { useState } from 'react';
import TransportersTable from '@/components/master/TransportersTable';
import TransportersFormModal from '@/components/master/TransportersFormModal';
import { Plus, Building2 } from 'lucide-react';

export default function TransportersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingTransporter(null);
    setIsModalOpen(true);
  };

  const handleEdit = (transporter: any) => {
    setEditingTransporter(transporter);
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
            <Building2 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Master Transporters</h1>
            <p className="text-sm text-slate-500">Manage fleet owners, vendors, and assignments</p>
          </div>
        </div>

        <button 
          onClick={handleAdd}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Transporter
        </button>
      </div>

      <TransportersTable 
        refreshTrigger={refreshTrigger} 
        onEdit={handleEdit} 
      />

      <TransportersFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        initialData={editingTransporter}
      />
    </div>
  );
}
