import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import { GoogleMapsProvider } from '@/lib/google-maps-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SENTRALOGIS | Unified Operational Matrix',
  description: 'The next generation of enterprise logistics orchestration.',
};

export const viewport = 'width=device-width, initial-scale=1, maximum-scale=1';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
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
      </body>
    </html>
  );
}
