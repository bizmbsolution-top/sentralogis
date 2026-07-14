import ExceptionDashboard from '@/components/director/ExceptionDashboard';

export default function CommercialExceptionPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <ExceptionDashboard 
        cluster="COMM"
        title="Commercial Command Center"
        description="Monitoring customer churn risks, pricing anomalies, and contract losses."
      />
    </div>
  );
}
