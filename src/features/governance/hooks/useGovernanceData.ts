import { useState, useEffect, useCallback } from 'react';
import { GovernanceSnapshot, GovernanceTrendSnapshot } from '../types';

export function useGovernanceData() {
  const [metrics, setMetrics] = useState<GovernanceSnapshot | null>(null);
  const [history, setHistory] = useState<GovernanceTrendSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [metricsRes, historyRes] = await Promise.all([
        fetch('/api/governance/summary'),
        fetch('/api/governance/history')
      ]);

      if (!metricsRes.ok) throw new Error('No governance reports generated.');
      
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);
      
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
      
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch governance data');
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    metrics,
    history,
    isLoading,
    error,
    refresh: fetchData,
    lastUpdated
  };
}
