'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Search, ArrowRight, Clock } from 'lucide-react';

export default function InvestigationPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ time: string; action: string; detail: string }>>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
    setResults([
      { time: new Date().toLocaleTimeString(), action: 'Search initiated', detail: `Looking up: ${query}` },
      { time: new Date(Date.now() - 1000).toLocaleTimeString(), action: 'Query dispatched', detail: 'Awaiting response...' },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Investigation</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Cari JO number, driver, fleet, container, correlation_id..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
          <button onClick={handleSearch} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {!searched && (
          <p className="text-xs text-slate-400 text-center py-4">
            Search for JO numbers, fleet plates, driver names, or correlation IDs to trace workflows
          </p>
        )}

        {searched && results.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No results for &quot;{query}&quot;</p>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono">{r.time}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300" />
                    <span className="font-semibold text-slate-900">{r.action}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
