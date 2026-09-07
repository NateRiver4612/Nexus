'use client';

import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Github, Sparkle } from 'lucide-react';
import { FormInput } from './FormInput';
import { authClient } from '@/lib/authClient';
// ^ Assumes FormInput follows the same pattern as FormTextArea:
//   { name, label?, placeholder?, type?, description?, disabled? }
//   self-controlled via useFormContext(). Adjust prop names below if yours differ.

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(' ');
}

// Minimal 4-color "G" mark — swap for your own asset if you have one.
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.48-1.13 2.73-2.4 3.58v2.98h3.88c2.27-2.09 3.54-5.17 3.54-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-2.98c-1.08.72-2.45 1.15-4.05 1.15-3.11 0-5.75-2.1-6.69-4.92H1.3v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.31 14.34A7.2 7.2 0 0 1 4.9 12c0-.81.14-1.6.4-2.34V6.57H1.3A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.3 5.43l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.23 0 12 0 7.31 0 3.26 2.7 1.3 6.57l4.01 3.09C6.25 6.85 8.89 4.75 12 4.75z"
      />
    </svg>
  );
}

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2.5',
        'text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-gray-200" />
      <span className="text-xs text-gray-400">or continue with</span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function ErrorAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
      {message}
    </p>
  );
}

function LoginForm({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit?: (values: LoginValues) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const form = useForm<LoginValues>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit?.(values))}
        className="flex flex-col gap-4"
      >
        <FormInput name="email" label="Email" type="email" placeholder="you@company.com" />

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <a href="#" className="text-xs font-medium text-blue-600 hover:underline">
              Forgot password?
            </a>
          </div>
          <FormInput name="password" type="password" placeholder="••••••••" />
        </div>

        <ErrorAlert message={error} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </FormProvider>
  );
}

function RegisterForm({
  onSubmit,
  submitting,
  error,
}: {
  onSubmit?: (values: RegisterValues) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const form = useForm<RegisterValues>({
    defaultValues: { fullName: '', email: '', password: '' },
    resolver: zodResolver(registerSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit?.(values))}
        className="flex flex-col gap-4"
      >
        <FormInput name="fullName" label="Full name" placeholder="Jordan Tran" />
        <FormInput name="email" label="Email" type="email" placeholder="you@company.com" />
        <FormInput name="password" label="Password" type="password" placeholder="••••••••" />

        <ErrorAlert message={error} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-gray-500">
          By continuing you agree to Nexus&apos;s{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </form>
    </FormProvider>
  );
}

export interface AuthCardProps {
  defaultTab?: 'login' | 'register';
  className?: string;
  onGoogleClick?: () => void;
  onGithubClick?: () => void;
}

export function AuthCard({
  defaultTab = 'login',
  className,
  onGoogleClick,
  onGithubClick,
}: AuthCardProps) {
  const [tab, setTab] = React.useState<'login' | 'register'>(defaultTab);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const router = useRouter();

  async function handleLogin(values: LoginValues) {
    setSubmitting(true);
    setError(null);
    const { error: authError } = await authClient.signIn.email(values);
    setSubmitting(false);
    if (authError) {
      setError(authError.message ?? 'Unable to log in.');
      return;
    }
    router.push('/');
  }

  async function handleRegister(values: RegisterValues) {
    setSubmitting(true);
    setError(null);
    const { error: authError } = await authClient.signUp.email({
      name: values.fullName,
      email: values.email,
      password: values.password,
    });
    setSubmitting(false);
    if (authError) {
      setError(authError.message ?? 'Unable to create account.');
      return;
    }
    router.push('/');
  }

  return (
    <div className={cn('flex w-full max-w-md flex-col items-center gap-6', className)}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-900">
          <Sparkle className="h-4 w-4 text-white" />
        </span>
        <span className="text-base font-semibold text-gray-900">Nexus</span>
      </div>

      <div className="w-full rounded-xl border border-gray-200 bg-white p-6">
        <div role="tablist" className="mb-6 flex border-b border-gray-200">
          {(['login', 'register'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setError(null);
              }}
              className={cn(
                'flex-1 border-b-2 pb-2.5 text-sm font-medium transition-colors',
                tab === value
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600',
              )}
            >
              {value === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          {tab === 'login' ? (
            <LoginForm onSubmit={handleLogin} submitting={submitting} error={error} />
          ) : (
            <RegisterForm onSubmit={handleRegister} submitting={submitting} error={error} />
          )}

          <Divider />

          <div className="flex flex-col gap-2">
            <SocialButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              onClick={onGoogleClick}
            />
            <SocialButton
              icon={<Github className="h-4 w-4" />}
              label="Continue with GitHub"
              onClick={onGithubClick}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {tab === 'login' ? (
          <>
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setTab('register')}
              className="font-medium text-blue-600 hover:underline"
            >
              Sign up free
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setTab('login')}
              className="font-medium text-blue-600 hover:underline"
            >
              Log in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
