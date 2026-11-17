import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from '@/lib/providers';
import './globals.css';
import 'katex/dist/katex.min.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'Modular monolith for planning and collaboration',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="pastel" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider>
          <Providers>{children}</Providers>
        </TooltipProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
