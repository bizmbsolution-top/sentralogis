"use client";

import { ReactNode } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { ReportingNav, ReportingNavMobile, getActiveReportFromPath } from "@/components/reporting/ReportingNav";
import { usePathname } from "next/navigation";

export default function OperationalLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const activeReport = getActiveReportFromPath(pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <ReportingNav activeCategory="operational" activeReport={activeReport} userRole={profile?.role} />
      <ReportingNavMobile activeCategory="operational" activeReport={activeReport} userRole={profile?.role} />
      <main className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24">
        {children}
      </main>
    </div>
  );
}