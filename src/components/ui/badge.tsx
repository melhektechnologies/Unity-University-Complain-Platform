import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Status variants
        submitted: 'border-blue-200 bg-blue-50 text-blue-700',
        'under-review': 'border-violet-200 bg-violet-50 text-violet-700',
        assigned: 'border-amber-200 bg-amber-50 text-amber-700',
        'in-progress': 'border-sky-200 bg-sky-50 text-sky-700',
        'pending-info': 'border-amber-300 bg-amber-100 text-amber-800',
        escalated: 'border-red-200 bg-red-50 text-red-700',
        resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        closed: 'border-gray-200 bg-gray-100 text-gray-600',
        reopened: 'border-orange-200 bg-orange-50 text-orange-700',
        // Priority variants
        low: 'border-gray-200 bg-gray-100 text-gray-600',
        medium: 'border-blue-200 bg-blue-50 text-blue-700',
        high: 'border-amber-200 bg-amber-50 text-amber-700',
        critical: 'border-red-200 bg-red-50 text-red-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

