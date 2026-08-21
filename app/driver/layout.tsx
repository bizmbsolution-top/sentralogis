import { DriverAuthProvider } from "@/lib/hooks/useDriverAuth";
import { ThemeProvider } from "@/lib/hooks/useTheme";
import { Toaster } from "react-hot-toast";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <DriverAuthProvider>
      <ThemeProvider>
        <Toaster position="top-center" containerClassName="!z-[9999]" />
        {children}
      </ThemeProvider>
    </DriverAuthProvider>
  );
}
