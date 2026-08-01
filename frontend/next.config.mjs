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

  // Pagination moved from "?sayfa=N" into the path so listing routes could
  // prerender: reading searchParams marks a route dynamic in Next 14, which
  // disabled ISR for every listing and left them at 0.6-1.5 s TTFB against
  // 0.22 s for the static article pages.
  //
  // These keep old links, shared URLs and anything already in Search Console
  // resolving. 308 (permanent) so the destination inherits the ranking signals.
  // "?sayfa=1" collapses to the clean base path, which is the canonical form.
  async redirects() {
    const paginated = [
      "/",
      "/firsatlar",
      "/pazarlar-ekonomi",
      "/ticaret-ihracat",
      "/diger",
      "/turk-is-dunyasi",
      "/etkinlikler-fuarlar",
      "/bolge/:slug",
      "/sektorler/:slug",
      "/hashtag/:tag",
      "/yazarlar/:slug",
    ];

    return paginated.flatMap((source) => [
      {
        source,
        has: [{ type: "query", key: "sayfa", value: "1" }],
        destination: source,
        permanent: true,
      },
      {
        source,
        has: [{ type: "query", key: "sayfa", value: "(?<n>\\d+)" }],
        destination: `${source === "/" ? "" : source}/sayfa/:n`,
        permanent: true,
      },
    ]);
  },
};

export default nextConfig;
