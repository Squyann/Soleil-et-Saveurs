import type { Metadata, Viewport } from 'next';
import AppliGestion from '@/components/gestion/AppliGestion';

// Application de gestion (équipe uniquement) : installable sur l'écran
// d'accueil, jamais indexée par les moteurs de recherche.
export const metadata: Metadata = {
  title: { default: 'Gestion · Soleil et Saveurs', template: '%s · Gestion' },
  description: 'Application de gestion de Soleil et Saveurs.',
  manifest: '/gestion.webmanifest',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'Gestion S&S', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#2F4A2B',
};

export default function LayoutGestion({ children }: { children: React.ReactNode }) {
  return <AppliGestion>{children}</AppliGestion>;
}
