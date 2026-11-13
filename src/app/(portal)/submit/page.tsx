'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { COMPLAINT_CATEGORIES } from '@/lib/complaints/categories';
import { CreateComplaintSchema, type CreateComplaintInput } from '@/lib/validation/schemas';

export default function SubmitComplaintPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<File[]>([]);

  const form = useForm<z.input<typeof CreateComplaintSchema>, unknown, CreateComplaintInput>({
    resolver: zodResolver(CreateComplaintSchema),
    defaultValues: {
      studentName: '',
      studentId: '',
      phone: '',
      email: '',
      category: undefined,
      description: '',
      evidenceCount: 0,
    },
  });

  const {
    formState: { errors },
    watch,
  } = form;

  async function onSubmit(data: CreateComplaintInput) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const requestBody = new FormData();
      requestBody.set('studentName', data.studentName);
      requestBody.set('studentId', data.studentId);
      requestBody.set('phone', data.phone);
      requestBody.set('email', data.email ?? '');
      requestBody.set('category', data.category);
      requestBody.set('description', data.description ?? '');
      requestBody.set('evidenceCount', String(evidence.length));
      evidence.forEach((file) => requestBody.append('evidence', file));

      const res = await fetch('/api/complaints/submit', {
        method: 'POST',
        body: requestBody,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Submission failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      sessionStorage.setItem(
        'uss_credentials',
        JSON.stringify({
          trackingNumber: json.trackingNumber,
          passcode: json.passcode,
          submittedAt: new Date().toISOString(),
        })
      );

      router.push('/submit/confirmation');
    } catch {
      setServerError('A network error occurred. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  }

  async function addEvidence(selectedFiles: FileList | null) {
    if (!selectedFiles) return;
    const incoming = Array.from(selectedFiles);
    const combined = [...evidence, ...incoming];
    if (combined.length > 3) {
      setServerError('Attach no more than 3 files.');
      return;
    }
    if (combined.some((file) => file.size <= 0 || file.size > 5 * 1024 * 1024)) {
      setServerError('Each attachment must be smaller than 5 MB.');
      return;
    }
    const allowedTypes = new Set([
      'image/jpeg', 'image/png', 'image/webp',
      'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/mpeg',
    ]);
    if (combined.some((file) => !allowedTypes.has(file.type))) {
      setServerError('Use JPEG, PNG, or WebP photos, or an approved audio file.');
      return;
    }
    if (combined.filter((file) => file.type.startsWith('audio/')).length > 1) {
      setServerError('Attach no more than one voice recording.');
      return;
    }

    const voice = incoming.find((file) => file.type.startsWith('audio/'));
    if (voice) {
      const validDuration = await new Promise<boolean>((resolve) => {
        const audio = document.createElement('audio');
        const url = URL.createObjectURL(voice);
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          const okay = Number.isFinite(audio.duration) && audio.duration <= 90;
          URL.revokeObjectURL(url);
          resolve(okay);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(false);
        };
        audio.src = url;
      });
      if (!validDuration) {
        setServerError('Voice recordings must be 90 seconds or shorter and playable by your browser.');
        return;
      }
    }

    setServerError(null);
    setEvidence(combined);
    form.setValue('evidenceCount', combined.length, { shouldValidate: true });
  }

  function removeEvidence(index: number) {
    const remaining = evidence.filter((_, fileIndex) => fileIndex !== index);
    setEvidence(remaining);
    form.setValue('evidenceCount', remaining.length, { shouldValidate: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-7">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/70">
          Student Affairs · New complaint
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#302E83] sm:text-3xl">
          Submit a campus complaint
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Tell Student Affairs what happened. After you submit, you will receive a tracking number
          and passcode so you can check your status anytime.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#302E83]/15 bg-[#302E83]/[0.04] p-4 text-sm leading-6 text-slate-700">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#302E83]" aria-hidden="true">i</span>
        <p>
          Your submission is received by the Student Affairs officer (the Student Dean). Your name,
          student ID, phone number, issue description, and attachments are shared with that officer
          so the complaint can be handled. Do not use this form for an urgent emergency.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <p className="font-semibold">Concern about the Student Dean or Student Affairs?</p>
        <p className="mt-1">
          This portal sends complaints to the Student Dean, so it cannot provide an independent
          review of a complaint about that office. Please contact the university directly and ask
          for an independent route before submitting such a complaint.
        </p>
        <a
          href="https://uu.edu.et/FOE/index.php/contact-us/"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-10 items-center font-semibold underline underline-offset-4"
        >
          Open Unity University’s official contact page
        </a>
      </div>

      <Card className="border-primary/10 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Complaint form</CardTitle>
          <CardDescription>
            Choose a category, describe the issue clearly, and include your contact details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="studentName">
                  Full name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="studentName"
                  autoComplete="name"
                  placeholder="As on your student ID"
                  className={errors.studentName ? 'border-red-400' : ''}
                  aria-invalid={!!errors.studentName}
                  {...form.register('studentName')}
                />
                {errors.studentName && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="size-3" />
                    {errors.studentName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="studentId">
                  Student ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="studentId"
                  placeholder="e.g. UU/0001/2022"
                  className={errors.studentId ? 'border-red-400' : ''}
                  aria-invalid={!!errors.studentId}
                  {...form.register('studentId')}
                />
                {errors.studentId && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="size-3" />
                    {errors.studentId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  Phone number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+251 9XX XXX XXX"
                  className={errors.phone ? 'border-red-400' : ''}
                  aria-invalid={!!errors.phone}
                  {...form.register('phone')}
                />
                {errors.phone && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="size-3" />
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Email{' '}
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@unity.edu.et"
                  className={errors.email ? 'border-red-400' : ''}
                  aria-invalid={!!errors.email}
                  {...form.register('email')}
                />
                {errors.email && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="size-3" />
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">
                Issue category <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                aria-invalid={!!errors.category}
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  errors.category && 'border-red-400'
                )}
                {...form.register('category')}
              >
                <option value="">Select a category…</option>
                {COMPLAINT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="size-3" />
                  {errors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Describe the issue in detail <span className="text-xs font-normal text-slate-400">(optional if you attach evidence)</span>
              </Label>
              <Textarea
                id="description"
                rows={7}
                aria-invalid={!!errors.description}
                placeholder="What happened? Where? When? What do you need Student Affairs to do?"
                className={errors.description ? 'border-red-400' : ''}
                {...form.register('description')}
              />
              <p className="text-right text-xs text-slate-400">
                {watch('description')?.length ?? 0}/5000
              </p>
              {errors.description && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="size-3" />
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <Label htmlFor="evidence">Photo or voice evidence <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
              <p className="text-xs leading-5 text-slate-500">
                Add up to 3 photos or one voice recording. Each file can be up to 5 MB; voice recordings must be 90 seconds or shorter.
              </p>
              <Input
                id="evidence"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,audio/ogg,audio/webm,audio/mp4,audio/mpeg"
                onChange={(event) => {
                  void addEvidence(event.target.files);
                  event.target.value = '';
                }}
                className="bg-white text-xs"
              />
              {evidence.length > 0 && (
                <ul className="space-y-1.5" aria-label="Selected evidence">
                  {evidence.map((file, index) => (
                    <li key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between gap-3 text-xs text-slate-600">
                      <span className="truncate">{file.name} · {(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                      <button type="button" onClick={() => removeEvidence(index)} className="shrink-0 text-primary underline">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {serverError && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[160px] bg-[#302E83] text-white hover:bg-[#252367]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Submit complaint'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
