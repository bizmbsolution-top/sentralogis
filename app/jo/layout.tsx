// [AI] Layout for /jo/[token] pages — adds driver PWA manifest and apple meta tags
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SentraLogis Driver',
  description: 'Tracking dan manajemen tugas pengiriman SentraLogis',
  manifest: '/driver-manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SL Driver',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#3b82f6',
};

export default function JoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
