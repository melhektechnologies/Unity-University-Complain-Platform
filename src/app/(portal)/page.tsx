import Link from 'next/link';
import { FileText, Search, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PortalLandingPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="text-center space-y-4 pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1B365D] leading-tight">
          Student Complaint & Support Portal
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          Submit a complaint or concern to the Office of Student Affairs. Your submission
          will be reviewed and you can track its progress at any time using your tracking number.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild size="lg" className="bg-[#1B365D] hover:bg-[#2A4A7F] text-white w-full sm:w-auto">
            <Link href="/submit">
              <FileText className="mr-2 h-4 w-4" />
              Submit a Complaint
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-[#1B365D] text-[#1B365D] hover:bg-blue-50 w-full sm:w-auto">
            <Link href="/track">
              <Search className="mr-2 h-4 w-4" />
              Track My Complaint
            </Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: FileText,
              step: '1',
              title: 'Submit',
              desc: 'Fill in the complaint form. You choose how much personal information to share.',
            },
            {
              icon: Clock,
              step: '2',
              title: 'Review',
              desc: 'The Office of Student Affairs reviews your complaint and updates its status.',
            },
            {
              icon: Search,
              step: '3',
              title: 'Track',
              desc: 'Use your unique tracking number and passcode to follow your case at any time.',
            },
          ].map(({ icon: Icon, step, title, desc }) => (
            <Card key={step} className="border-slate-200">
              <CardContent className="pt-5 pb-5 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#1B365D]/10 flex items-center justify-center mx-auto">
                  <Icon className="h-4 w-4 text-[#1B365D]" />
                </div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Step {step}</p>
                <p className="font-semibold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Privacy note */}
      <section>
        <Card className="border-[#008080]/30 bg-teal-50/40">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3 items-start">
              <ShieldCheck className="h-5 w-5 text-[#008080] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-700">Your privacy is protected</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You can choose to submit <strong>Identified</strong> (your name visible to handlers),{' '}
                  <strong>Confidential</strong> (your identity known only to senior staff), or{' '}
                  <strong>Anonymous</strong> (no personal information collected at all). All cases are
                  handled securely by the Office of Student Affairs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CMS admin link (subtle, not promoted) */}
      <div className="text-center">
        <Link
          href="/admin/login"
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Staff / Administration login →
        </Link>
      </div>
    </div>
  );
}

