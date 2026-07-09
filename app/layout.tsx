import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { GoogleMapsProvider } from '@/lib/google-maps-context';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SENTRALOGIS | Unified Operational Matrix',
  description: 'The next generation of enterprise logistics orchestration.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <GoogleMapsProvider>
              <Toaster 
                position="top-right" 
                toastOptions={{
                  success: {
                    duration: 1000,
                  },
                  error: {
                    duration: 4000,
                  },
                }}
              />
              {children}
            </GoogleMapsProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
