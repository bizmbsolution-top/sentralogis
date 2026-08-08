'use client';

import React from 'react';
import { Building2, MapPin, User, Phone } from 'lucide-react';

export interface CustomerInfo {
  id: string;
  name: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
}

export interface CustomerCardProps {
  customer: CustomerInfo | null;
}

export default function CustomerCard({ customer }: CustomerCardProps) {
  if (!customer) {
    return (
      <div className="flex items-center justify-center p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500">
        <Building2 className="w-5 h-5 mr-2 opacity-50" />
        <span className="text-sm font-medium">No customer data</span>
      </div>
    );
  }

  return (
    <div className="flex items-start p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 gap-4">
      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mt-1">
        <Building2 className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 truncate">{customer.name}</h4>
        
        {customer.address && (
          <div className="flex items-start gap-1.5 text-slate-500 text-xs mt-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{customer.address}</span>
          </div>
        )}
        
        {(customer.contactPerson || customer.phone) && (
          <div className="flex items-center text-slate-600 text-xs mt-2 gap-3 pt-2 border-t border-slate-100">
            {customer.contactPerson && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="truncate">{customer.contactPerson}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{customer.phone}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
