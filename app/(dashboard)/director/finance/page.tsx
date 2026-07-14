import ExceptionDashboard from '@/components/director/ExceptionDashboard';

export default function FinanceExceptionPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <ExceptionDashboard 
        cluster="FIN"
        title="Finance Command Center"
        description="Monitoring cash leakages, negative margins, and overdue receivables."
      />
    </div>
  );
}
