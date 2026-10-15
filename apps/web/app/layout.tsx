import type { Metadata } from 'next';
import { Providers } from '@/lib/providers';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Nexus',
  description: 'Modular monolith for planning and collaboration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider>
          <Providers>{children}</Providers>
        </TooltipProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
