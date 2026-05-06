'use client';

import { Card } from '@/components/ui/Card';

export default function HQCoordinationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coordination</h1>
        <p className="text-slate-500 text-sm mt-1">Kelola manajemen Coordination</p>
      </div>

      <Card className="p-8 text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🚧</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Halaman dalam Pengembangan
          </h2>
          <p className="text-slate-500 max-w-md">
            Halaman Coordination sedang kami bangun. 
            Fitur ini akan tersedia pada rilis berikutnya.
          </p>
          <div className="mt-6 flex gap-2">
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-sm rounded-full">
              Coming Soon
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
