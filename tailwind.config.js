/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // ── CSS-variable-based color system (shadcn/ui compatible) ─────────────
      colors: {
        // shadcn/ui semantic tokens
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ── Unity University brand palette ───────────────────────────────────
        university: {
          indigo: 'hsl(var(--university-indigo))',
          'indigo-deep': 'hsl(var(--university-indigo-deep))',
          gold: 'hsl(var(--university-gold))',
          'gold-soft': 'hsl(var(--university-gold-soft))',
        },
        institutional: {
          navy: '#302E83',
          'navy-light': '#252367',
          teal: '#008080',
          'teal-light': '#0D9488',
          accent: '#0E7490',
          dark: '#0F172A',      // Near-black body text
          surface: '#F8FAFC',   // Page background
          'surface-raised': '#FFFFFF', // Card/panel background
          muted: '#64748B',     // Muted text (slate-500)
          'muted-bg': '#F1F5F9', // Muted backgrounds (slate-100)
          border: '#E2E8F0',    // Default borders (slate-200)
        },
        // ── Status colours ───────────────────────────────────────────────────
        status: {
          // Complaint lifecycle
          submitted: { DEFAULT: '#3B82F6', fg: '#EFF6FF' },   // blue
          'under-review': { DEFAULT: '#8B5CF6', fg: '#F5F3FF' }, // violet
          assigned: { DEFAULT: '#F59E0B', fg: '#FFFBEB' },    // amber
          'in-progress': { DEFAULT: '#0EA5E9', fg: '#F0F9FF' }, // sky
          'pending-info': { DEFAULT: '#D97706', fg: '#FEF3C7' }, // amber-dark
          escalated: { DEFAULT: '#EF4444', fg: '#FEF2F2' },   // red
          resolved: { DEFAULT: '#10B981', fg: '#ECFDF5' },    // emerald
          closed: { DEFAULT: '#6B7280', fg: '#F9FAFB' },      // gray
          reopened: { DEFAULT: '#F97316', fg: '#FFF7ED' },    // orange
          // Priority
          low: { DEFAULT: '#6B7280', fg: '#F9FAFB' },
          medium: { DEFAULT: '#3B82F6', fg: '#EFF6FF' },
          high: { DEFAULT: '#F59E0B', fg: '#FFFBEB' },
          critical: { DEFAULT: '#EF4444', fg: '#FEF2F2' },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Accessible minimum sizes
        'body-sm': ['0.875rem', { lineHeight: '1.5rem' }],
        body: ['1rem', { lineHeight: '1.75rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.875rem' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
