'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitySeal } from '@/components/ui/unity-seal';

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
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-primary px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute -right-28 -top-28 size-[26rem] rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-12 -top-12 size-[22rem] rounded-full border border-university-gold/25" aria-hidden="true" />
        <Link href="/" className="relative inline-flex w-fit items-center gap-4 rounded-sm" aria-label="Unity University Student Support home">
          <UnitySeal size={64} />
          <span>
            <span className="block text-lg font-semibold tracking-wide">Unity University</span>
            <span className="mt-1 block text-sm text-white/65">Office of Student Affairs</span>
          </span>
        </Link>
        <div className="relative max-w-xl pb-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
            <span className="size-2 rounded-full bg-university-gold" /> Staff workspace
          </p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">A thoughtful process for every student concern.</h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
            Sign in with your Unity University staff account to access the complaint queue and case information available to your role.
          </p>
          <div className="mt-8 flex items-center gap-3 border-t border-white/15 pt-5 text-sm text-white/70">
            <ShieldCheck aria-hidden="true" className="size-5 text-university-gold" />
            Protected staff access
          </div>
        </div>
        <p className="relative text-xs text-white/45">© {new Date().getFullYear()} Unity University · Ethiopia</p>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md space-y-7">
          <div className="flex items-center gap-3 lg:hidden">
            <UnitySeal size={48} />
            <div>
              <p className="text-sm font-semibold text-primary">Unity University</p>
              <p className="text-xs text-muted-foreground">Office of Student Affairs</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">Staff access</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
            <p className="text-sm leading-6 text-muted-foreground">Sign in to continue to the Student Affairs workspace.</p>
          </div>

          <Card className="border-primary/10 bg-white shadow-[0_18px_55px_-36px_rgba(49,46,129,0.4)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-flex size-8 items-center justify-center rounded-lg bg-university-gold-soft text-primary">
                  <LockKeyhole aria-hidden="true" className="size-4" />
                </span>
                Sign in to your account
              </CardTitle>
              <CardDescription className="text-sm">Use your Unity University staff credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@unity.edu.et"
                    autoComplete="username"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={form.formState.errors.email ? 'email-error' : undefined}
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && <p id="email-error" className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                    {...form.register('password')}
                  />
                  {form.formState.errors.password && <p id="password-error" className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button type="submit" disabled={isLoading} className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-university-indigo-deep">
                  {isLoading ? 'Signing in…' : 'Sign in'}
                  {!isLoading && <ArrowRight aria-hidden="true" className="ml-2 size-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole aria-hidden="true" className="size-3.5" /> Secure staff sign-in
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Not staff? <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">Go to student support</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
