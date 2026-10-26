import { AppShell } from '@/components/AppShell';
import { AuthGuard } from '@/components/AuthGuard';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
