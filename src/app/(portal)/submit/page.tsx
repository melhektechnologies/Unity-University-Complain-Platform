'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, ChevronLeft, ShieldCheck, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Simplified client-side schema (no UUIDs — we'll use static options for now) ───
const SubmitSchema = z
  .object({
    privacyType: z.enum(['IDENTIFIED', 'CONFIDENTIAL', 'ANONYMOUS']),
    category: z.string().min(1, 'Please select a category'),
    subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
    description: z.string().min(20, 'Please describe the issue in at least 20 characters').max(5000),
    incidentDate: z.string().min(1, 'Please provide the date of the incident'),
    accusedParty: z.string().max(200).optional(),
    // Identity fields — only required for non-anonymous
    studentName: z.string().optional(),
    studentId: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.privacyType !== 'ANONYMOUS') {
        return !!d.studentName && !!d.studentId && !!d.email;
      }
      return true;
    },
    {
      message: 'Your name, student ID, and email are required for this submission type.',
      path: ['studentName'],
    }
  );

type FormData = z.infer<typeof SubmitSchema>;

const CATEGORIES = [
  'Academic Assessment & Grading',
  'Faculty / Staff Conduct',
  'Campus Facilities',
  'Financial & Scholarship',
  'Harassment or Discrimination',
  'Administrative Services',
  'Library & Resources',
  'Other',
];

const PRIVACY_OPTIONS = [
  {
    value: 'IDENTIFIED' as const,
    label: 'Identified',
    icon: Eye,
    color: 'border-blue-300 bg-blue-50',
    selectedColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-500',
    desc: 'Your identity is visible to the case handler. Best for matters requiring direct follow-up.',
  },
  {
    value: 'CONFIDENTIAL' as const,
    label: 'Confidential',
    icon: ShieldCheck,
    color: 'border-teal-300 bg-teal-50',
    selectedColor: 'border-teal-500 bg-teal-100 ring-2 ring-teal-500',
    desc: 'Your identity is known only to senior staff — not shared with the accused party or other handlers.',
  },
  {
    value: 'ANONYMOUS' as const,
    label: 'Anonymous',
    icon: EyeOff,
    color: 'border-slate-300 bg-slate-50',
    selectedColor: 'border-slate-500 bg-slate-200 ring-2 ring-slate-500',
    desc: 'No personal information is collected or stored. We cannot contact you, but we will act on the complaint.',
  },
];

type Step = 1 | 2 | 3;

export default function SubmitComplaintPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(SubmitSchema),
    defaultValues: {
      privacyType: 'IDENTIFIED',
      category: '',
      subject: '',
      description: '',
      incidentDate: '',
      accusedParty: '',
      studentName: '',
      studentId: '',
      email: '',
      phone: '',
    },
  });

  const { watch, setValue, formState: { errors } } = form;
  const privacyType = watch('privacyType');
  const isAnonymous = privacyType === 'ANONYMOUS';

  async function handleNext() {
    let valid = false;
    if (step === 1) {
      valid = true; // privacy selection always valid
    } else if (step === 2) {
      valid = await form.trigger(['category', 'subject', 'description', 'incidentDate']);
    } else if (step === 3) {
      valid = await form.trigger(
        isAnonymous
          ? []
          : ['studentName', 'studentId', 'email']
      );
    }
    if (valid) setStep((s) => (s + 1) as Step);
  }

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch('/api/complaints/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setServerError(json.error ?? 'Submission failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Store credentials in sessionStorage for the confirmation page
      // (never stored in DB in cleartext — only shown once)
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

  const stepLabels = ['Privacy', 'Your Complaint', 'Your Details'];

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-[#1B365D]">Submit a Complaint</h1>
        <p className="text-sm text-slate-500 mt-1">
          Step {step} of 3 — {stepLabels[step - 1]}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                s < step
                  ? 'bg-[#1B365D] border-[#1B365D] text-white'
                  : s === step
                  ? 'border-[#1B365D] text-[#1B365D] bg-white'
                  : 'border-slate-300 text-slate-400 bg-white'
              )}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={cn('h-0.5 w-8 sm:w-16 transition-colors', s < step ? 'bg-[#1B365D]' : 'bg-slate-200')} />}
          </div>
        ))}
        <span className="ml-auto text-xs text-slate-400 hidden sm:block">
          {stepLabels[step - 1]}
        </span>
      </div>

      {/* ── STEP 1: Privacy Selection ── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose your privacy level</CardTitle>
            <CardDescription>
              This determines how your personal information is handled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PRIVACY_OPTIONS.map(({ value, label, icon: Icon, color, selectedColor, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue('privacyType', value)}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all',
                  privacyType === value ? selectedColor : color,
                  'hover:opacity-90'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-slate-700 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">{label}</span>
                  {value === 'CONFIDENTIAL' && (
                    <Badge variant="secondary" className="text-[10px] ml-auto">Recommended</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Complaint Details ── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Describe your complaint</CardTitle>
            <CardDescription>
              Be as specific as possible. Include dates, locations, and names where relevant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                className={cn(
                  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                  errors.category && 'border-red-400 ring-red-200'
                )}
                {...form.register('category')}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.category.message}
                </p>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label htmlFor="subject">
                Subject / Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="e.g. Unfair grade in CHEM 101 final exam"
                className={errors.subject ? 'border-red-400' : ''}
                {...form.register('subject')}
              />
              {errors.subject && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.subject.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                Full Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe what happened, when it occurred, who was involved, and what outcome you are seeking…"
                rows={6}
                className={errors.description ? 'border-red-400' : ''}
                {...form.register('description')}
              />
              <p className="text-xs text-slate-400 text-right">
                {watch('description')?.length ?? 0}/5000
              </p>
              {errors.description && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.description.message}
                </p>
              )}
            </div>

            {/* Incident date */}
            <div className="space-y-1.5">
              <Label htmlFor="incidentDate">
                Date of Incident <span className="text-red-500">*</span>
              </Label>
              <Input
                id="incidentDate"
                type="date"
                max={new Date().toISOString().split('T')[0]}
                className={errors.incidentDate ? 'border-red-400' : ''}
                {...form.register('incidentDate')}
              />
              {errors.incidentDate && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />{errors.incidentDate.message}
                </p>
              )}
            </div>

            {/* Accused party (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="accusedParty">
                Person(s) Involved{' '}
                <span className="text-xs font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                id="accusedParty"
                placeholder="Name or position of the person(s) involved, if known"
                {...form.register('accusedParty')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: Identity ── */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAnonymous ? 'Review and confirm' : 'Your contact information'}
            </CardTitle>
            <CardDescription>
              {isAnonymous
                ? 'You chose Anonymous submission — no personal information will be stored. Review your complaint before submitting.'
                : 'This information will be handled according to your chosen privacy level.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAnonymous ? (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</p>
                  <p className="text-sm text-slate-800">{watch('category')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</p>
                  <p className="text-sm text-slate-800">{watch('subject')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date of Incident</p>
                  <p className="text-sm text-slate-800">{watch('incidentDate')}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-800 flex gap-2 items-start">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  Since this is anonymous, we cannot contact you with updates. Save your tracking number carefully after submission.
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="studentName">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentName"
                      placeholder="As it appears on your student ID"
                      className={errors.studentName ? 'border-red-400' : ''}
                      {...form.register('studentName')}
                    />
                    {errors.studentName && (
                      <p className="text-xs text-red-600">{errors.studentName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="studentId">
                      Student ID Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="studentId"
                      placeholder="e.g. UU/0001/2022"
                      className={errors.studentId ? 'border-red-400' : ''}
                      {...form.register('studentId')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">
                      Institutional Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@unity.edu.et"
                      className={errors.email ? 'border-red-400' : ''}
                      {...form.register('email')}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">
                      Phone{' '}
                      <span className="text-xs font-normal text-slate-400">(optional)</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+251 9XX XXX XXX"
                      {...form.register('phone')}
                    />
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-800">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Your information is protected under the{' '}
                    <strong>
                      {privacyType === 'CONFIDENTIAL' ? 'Confidential' : 'Identified'}
                    </strong>{' '}
                    policy you selected.
                    {privacyType === 'CONFIDENTIAL' && ' Your identity will not be shared with the accused party.'}
                  </span>
                </div>
              </>
            )}

            {/* Server error */}
            {serverError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="border-slate-300"
            disabled={isSubmitting}
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="ml-auto bg-[#1B365D] hover:bg-[#2A4A7F] text-white"
          >
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="ml-auto bg-[#1B365D] hover:bg-[#2A4A7F] text-white min-w-[140px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              'Submit Complaint'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

