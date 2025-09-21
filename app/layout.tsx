import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';


export const metadata: Metadata = {
  title: 'Trading Manager - Gestión Personal de Trading',
  description: 'Aplicación personal para gestionar y analizar operaciones de trading',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}