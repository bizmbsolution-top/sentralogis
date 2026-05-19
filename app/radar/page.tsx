import GlobalRadarConsole from '@/components/sbu/GlobalRadarConsole';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Global Fleet Radar | Sentralogis',
  description: 'Real-time fleet monitoring and command center',
};

export default function GlobalRadarPage() {
  return (
    <div className="h-screen w-screen bg-[#0a192f] overflow-hidden">
      <GlobalRadarConsole />
    </div>
  );
}
