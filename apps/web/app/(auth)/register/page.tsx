import { AuthCard } from '@/components/AuthCard';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen container items-center justify-center">
      <AuthCard defaultTab="register" />
    </main>
  );
}
