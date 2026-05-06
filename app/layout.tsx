import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'SENTRALOGIS | Unified Operational Matrix',
  description: 'The next generation of enterprise logistics orchestration.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          async
          defer
        />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}