import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Live Tracking | SentraLogis',
  description: 'Pantau pengiriman Anda secara real-time dengan SentraLogis.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SL Tracking'
  },
  manifest: '/manifest.json' // Though it might be pointing to /driver/portal, it enables "Add to Home Screen"
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0f1e',
};

export default function TrackWOLayout({ children }: { children: React.ReactNode }) {
  return children;
}
