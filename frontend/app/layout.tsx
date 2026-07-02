import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthListener from "@/components/auth/AuthListener";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.afrikahaberleri.tr"),
  title: {
    default: "Afrika Haberleri",
    template: "%s | Afrika Haberleri",
  },
  description: "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için seçilmiş güncel haberlerle takip edin. Haberleri incele.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "https://krtpfjqrxhuockmckkyk.supabase.co";

  return (
    <html lang="tr" className={inter.variable}>
      <head>
        <link rel="preconnect" href={supabaseHostname} />
        <link rel="dns-prefetch" href={supabaseHostname} />
      </head>
      <body className="bg-background text-on-surface font-sans min-h-screen flex flex-col antialiased">
        <AuthListener />
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
      <GoogleAnalytics gaId="G-TWW2BKCGWR" />
    </html>
  );
}
