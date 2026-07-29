import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sentralogis Ground Staff',
  description: 'Field Operations - Gate In / Gate Out',
  manifest: '/manifest.ground.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ground Staff',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function GroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
