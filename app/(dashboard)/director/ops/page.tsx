import ExceptionDashboard from '@/components/director/ExceptionDashboard';

export default function OpsExceptionPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <ExceptionDashboard 
        cluster="OPS"
        title="Ops Command Center"
        description="Monitoring operational anomalies, SLA deadlocks, and asset utilization exceptions."
      />
    </div>
  );
}
