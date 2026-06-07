import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ClientShell from '@/components/ClientShell';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Soleil et Saveurs',
  description: 'Fruits et légumes ultra-locaux, livrés chez vous dans le 78.',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-[#EDE3D5] antialiased overflow-x-hidden`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
