import { DriverAuthProvider } from "@/lib/hooks/useDriverAuth";
import { Toaster } from "react-hot-toast";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverAuthProvider>
      <Toaster position="top-center" containerClassName="!z-[9999]" />
      {children}
    </DriverAuthProvider>
  );
}
