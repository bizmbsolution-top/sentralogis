import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SentraLogis Driver Portal',
    short_name: 'Driver SL',
    description: 'Portal Internal Driver SentraLogis',
    start_url: '/driver/portal',
    display: 'standalone',
    background_color: '#020617', // slate-950
    theme_color: '#4f46e5',      // indigo-600
    icons: [
      {
        src: '/sentralogis_logo.png',
        sizes: '192x192 512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
