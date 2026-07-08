/** @type {import('next').NextConfig} */

const SUPABASE_HOSTNAME = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `img-src 'self' data: https://${SUPABASE_HOSTNAME} https://ichef.bbci.co.uk https://images.theconversation.com`,
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      // Fonts are self-hosted by next/font (Inter); no Google Fonts CDN at runtime.
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `connect-src 'self' https://${SUPABASE_HOSTNAME} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com`,
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
