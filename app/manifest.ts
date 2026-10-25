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
        src: '/logosentralogis.png',
        sizes: 'any',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
}
