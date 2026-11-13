import type { Metadata } from 'next';

// Page personnelle (lien des e-mails) : jamais indexée
export const metadata: Metadata = {
  title: 'Désinscription — Soleil et Saveurs',
  robots: { index: false, follow: false },
};

export default function Gabarit({ children }: { children: React.ReactNode }) {
  return children;
}
