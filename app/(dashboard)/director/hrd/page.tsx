import ExceptionDashboard from '@/components/director/ExceptionDashboard';

export default function HRDExceptionPage() {
  return (
    <div className="max-w-6xl mx-auto py-8">
      <ExceptionDashboard 
        cluster="HRD"
        title="HR & Compliance Command Center"
        description="Monitoring employee absenteeism, overtime abuse, and critical compliance expirations (SIM, STNK, KIR)."
      />
    </div>
  );
}
