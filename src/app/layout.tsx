import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import ClientShell from '@/components/ClientShell';
import './globals.css';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-texte', display: 'swap' });
// Titres : serif assortie au logo (classe .titre, src/app/globals.css)
const fraunces = Fraunces({ subsets: ['latin'], style: ['normal', 'italic'], axes: ['opsz'], variable: '--font-titre', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2F4A2B',
};

export const metadata: Metadata = {
  // Adresse du site : sert à compléter les liens des aperçus de partage et de Google
  metadataBase: new URL('https://soleiletsaveurs.fr'),
  title: 'Soleil et Saveurs',
  description: 'Fruits et légumes frais, livrés chez vous dans les Yvelines (78).',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={`${dmSans.className} ${dmSans.variable} ${fraunces.variable} bg-[#EDE3D5] antialiased overflow-x-hidden`}>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
