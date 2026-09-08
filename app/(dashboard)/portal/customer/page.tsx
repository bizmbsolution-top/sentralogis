'use client';

import React from 'react';
import {
  ShoppingCart,
  Ship,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package
} from 'lucide-react';
import Link from 'next/link';

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  value: number;
  currency: string;
  createdAt: string;
}

interface ShipmentSummary {
  id: string;
  reference: string;
  status: string;
  origin: string;
  destination: string;
  eta: string;
}

const ORDERS: OrderSummary[] = [
  { id: '1', orderNumber: 'SO-XXXX-0001', status: 'CONFIRMED', value: 17500, currency: 'USD', createdAt: '2026-09-01' },
  { id: '2', orderNumber: 'SO-XXXX-0002', status: 'IN_FULFILLMENT', value: 8200, currency: 'USD', createdAt: '2026-08-30' },
];

const SHIPMENTS: ShipmentSummary[] = [
  { id: '1', reference: 'SHP-XXXX-0001', status: 'IN_TRANSIT', origin: 'Shanghai', destination: 'Subang', eta: '2026-09-15' },
  { id: '2', reference: 'SHP-XXXX-0002', status: 'DELIVERED', origin: 'Shenzhen', destination: 'Jakarta', eta: '2026-09-10' },
];

export default function CustomerPortal() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          My Orders
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your orders, shipments, and documents
        </p>
      </div>

      {/* Orders */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-500" />
          Orders
        </h2>
        <div className="space-y-2">
          {ORDERS.map((order) => (
            <Link
              key={order.id}
              href={`/portal/orders/${order.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{order.orderNumber}</div>
                <div className="text-xs text-slate-500">{order.status} — {order.currency} {order.value.toLocaleString()}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>

      {/* Shipments */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-500" />
          Shipments
        </h2>
        <div className="space-y-2">
          {SHIPMENTS.map((shipment) => (
            <Link
              key={shipment.id}
              href={`/track/fwd/${shipment.id}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{shipment.reference}</div>
                <div className="text-xs text-slate-500">{shipment.origin} → {shipment.destination} — {shipment.status}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
