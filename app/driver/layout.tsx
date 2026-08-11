import { DriverAuthProvider } from "@/lib/hooks/useDriverAuth";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverAuthProvider>
      {children}
    </DriverAuthProvider>
  );
}
