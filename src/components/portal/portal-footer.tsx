import Link from 'next/link';

export function PortalFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="content-container flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Unity University · Ethiopia</p>
        <p>Office of Student Affairs</p>
        <Link
          href="/admin/login"
          className="min-h-9 self-start rounded-sm underline-offset-4 transition hover:text-primary hover:underline sm:self-auto"
        >
          Staff sign in
        </Link>
      </div>
    </footer>
  );
}
