import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google"; // Switch to Atlas Standard Font
import { Toaster } from "react-hot-toast";
import { GoogleMapsProvider } from "@/lib/google-maps-context";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // High weights for Atlas style
});

export const metadata: Metadata = {
  title: "Sentralogis. - Operational Dashboard",
  description: "Advanced Multi-Tenant Logistics Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}