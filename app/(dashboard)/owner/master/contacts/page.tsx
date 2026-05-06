'use client';

import React, { useState } from 'react';
import ContactsTable from '@/components/master/ContactsTable';
import ContactsFormModal from '@/components/master/ContactsFormModal';
import { Plus, Users } from 'lucide-react';

export default function ContactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleAdd = () => {
    setEditingContact(null);
    setIsModalOpen(true);
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">Master Contacts</h1>
            <p className="text-xs md:text-sm text-slate-500">Manage your customers, vendors, and partners</p>
          </div>
        </div>
        
        <button onClick={handleAdd} className="btn-primary flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          Add New Contact
        </button>
      </div>

      <ContactsTable refreshTrigger={refreshTrigger} onEdit={handleEdit} />

      <ContactsFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        initialData={editingContact}
      />
    </div>
  );
}
