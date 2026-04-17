import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      </header>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
