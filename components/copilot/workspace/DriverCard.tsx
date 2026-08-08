'use client';

import React from 'react';
import { User, Phone, MapPin, CircleDot } from 'lucide-react';

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  photoUrl?: string;
  lastGpsLat?: number;
  lastGpsLng?: number;
  lastGpsTime?: string;
  vehiclePlate?: string;
  status: 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'SOS';
}

export interface DriverCardProps {
  driver: DriverInfo | null;
}

export default function DriverCard({ driver }: DriverCardProps) {
  if (!driver) {
    return (
      <div className="flex items-center justify-center p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500">
        <User className="w-5 h-5 mr-2 opacity-50" />
        <span className="text-sm font-medium">No driver assigned</span>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-500 bg-emerald-100';
      case 'IDLE': return 'text-amber-500 bg-amber-100';
      case 'SOS': return 'text-rose-500 bg-rose-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  const getGpsStatus = (time?: string) => {
    if (!time) return { color: 'bg-red-500', text: 'Offline' };
    const diff = new Date().getTime() - new Date(time).getTime();
    if (diff < 5 * 60 * 1000) return { color: 'bg-emerald-500', text: '< 5m' };
    return { color: 'bg-amber-500', text: '> 5m' };
  };

  const gps = getGpsStatus(driver.lastGpsTime);

  return (
    <div className="flex items-center p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 gap-4">
      <div className="relative">
        {driver.photoUrl ? (
          <img src={driver.photoUrl} alt={driver.name} className="w-12 h-12 rounded-full object-cover border border-slate-200" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg border border-indigo-200">
            {getInitials(driver.name)}
          </div>
        )}
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(driver.status).split(' ')[0].replace('text-', 'bg-')}`} title={driver.status} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-900 truncate">{driver.name}</h4>
        <div className="flex items-center text-slate-500 text-xs mt-1 gap-3">
          <div className="flex items-center gap-1">
            <Phone className="w-3 h-3" />
            <span>{driver.phone}</span>
          </div>
          {driver.vehiclePlate && (
            <div className="flex items-center gap-1 font-mono bg-slate-100 px-1.5 rounded">
              {driver.vehiclePlate}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-[10px] font-medium bg-slate-100 px-2 py-0.5 rounded-full">
          <CircleDot className={`w-2 h-2 ${gps.color.replace('bg-', 'text-')}`} />
          <span className="text-slate-600">GPS {gps.text}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(driver.status)}`}>
          {driver.status}
        </span>
      </div>
    </div>
  );
}
