import ExceptionDashboard from '@/components/director/ExceptionDashboard';

export default function BizDevExceptionPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <ExceptionDashboard 
        cluster="BIZDEV"
        title="Business Development Command Center"
        description="Monitoring new service adoption, stagnant pipelines, and missed milestones."
      />
    </div>
  );
}
