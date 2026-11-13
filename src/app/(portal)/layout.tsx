import { PortalFooter, PortalHeader, SkipLink } from '@/components/portal';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink />
      <PortalHeader />
      <main id="main-content" className="content-container page-enter w-full flex-1 py-8 sm:py-12 lg:py-16">
        {children}
      </main>
      <PortalFooter />
    </div>
  );
}
