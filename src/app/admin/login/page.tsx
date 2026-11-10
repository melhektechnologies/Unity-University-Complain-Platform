'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const LoginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Sign-in failed. Check your credentials and try again.');
        setIsLoading(false);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-[#1B365D] flex items-center justify-center mx-auto mb-3">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-[#1B365D]">Student Affairs CMS</h1>
          <p className="text-sm text-slate-500">Unity University · Staff Access</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Sign in to your account</CardTitle>
            <CardDescription className="text-xs">
              Use your Unity University staff credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@unity.edu.et"
                autoComplete="email"
                className={form.formState.errors.email ? 'border-red-400' : ''}
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className={form.formState.errors.password ? 'border-red-400' : ''}
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <Button
              type="button"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading}
              className="w-full bg-[#1B365D] hover:bg-[#2A4A7F] text-white"
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in…</>
              ) : (
                'Sign In'
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Not staff?{' '}
          <a href="/" className="underline hover:text-slate-600">
            Go to Student Portal
          </a>
        </p>
      </div>
    </div>
  );
}
