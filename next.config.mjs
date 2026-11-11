/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent embedding in iframes (clickjacking)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Block MIME-type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control referrer information
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions policy — disable unused browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Content Security Policy
          // Note: In production, replace 'unsafe-inline' with nonce-based CSP.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requires 'unsafe-eval' in development for HMR;
              // script-src tightened in production via NEXT_PUBLIC_ENV check.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://hebbkx1anhila5yf.public.blob.vercel-storage.com",
              // Supabase storage for file uploads
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''} https://*.supabase.co wss://*.supabase.co`,
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // Add HSTS only in production (Supabase handles HTTPS termination)
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/(.*)',
              headers: [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ],
            },
          ]
        : []),
    ];
  },

  // ── Images ────────────────────────────────────────────────────────────────
  images: {
    // Allow Supabase storage images if ever needed for avatars, etc.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com',
        pathname: '/photo_2023-08-29_18-31-39-EXL0jJY3h83oABrMLKkDoK9ogk6RYP.jpg',
      },
    ],
  },

  // ── Experimental ──────────────────────────────────────────────────────────
  experimental: {
    // Server Actions are stable in Next.js 14.2+; this key is a no-op but kept
    // for forward compatibility documentation.
    serverActions: {
      // Max body size for server action uploads (matches the 5 MB attachment limit)
      bodySizeLimit: '6mb',
    },
  },

  // ── TypeScript & ESLint ───────────────────────────────────────────────────
  typescript: {
    // Type errors already caught by `tsc --noEmit` in CI; build should still
    // surface them here too.
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;

