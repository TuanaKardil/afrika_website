import type { Metadata } from "next";
import { buildCanonical } from "@/lib/seo";
import HomeBody from "./home-body";

// No searchParams in this file: reading it (even only in generateMetadata) made
// the homepage dynamic, so it was rebuilt and re-queried on every visit instead
// of being served from the edge. Pagination lives at /sayfa/[n].
export const revalidate = 1800;

const HOME_DESCRIPTION = "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için seçilmiş güncel haberlerle takip edin. Haberleri incele.";

export function generateMetadata(): Metadata {
  return {
    title: { absolute: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri" },
    description: HOME_DESCRIPTION,
    alternates: { canonical: buildCanonical("/") },
    openGraph: {
      type: "website",
      siteName: "Afrika Haberleri",
      locale: "tr_TR",
      url: "/",
      title: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri",
      description: HOME_DESCRIPTION,
    },
    twitter: {
      card: "summary_large_image",
      title: "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri",
      description: HOME_DESCRIPTION,
    },
  };
}

const SITE_URL = "https://www.afrikahaberleri.tr";

// NewsMediaOrganization + WebSite schema live on the homepage only (Google's
// recommended placement), so they stay here rather than in HomeBody: /sayfa/[n]
// must not restate them. No SearchAction: the sitelinks search box was
// retired in November 2024. `sameAs` links the brand to its official social
// profiles — add more URLs (X, Instagram, Facebook) here as accounts are created.
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": `${SITE_URL}/#organization`,
  "name": "Afrika Haberleri",
  "url": SITE_URL,
  "logo": {
    "@type": "ImageObject",
    "url": `${SITE_URL}/icon.png`,
    "width": 512,
    "height": 512,
  },
  "email": "iletisim@afrikahaberleri.tr",
  "sameAs": ["https://www.linkedin.com/company/afrika-haberleri/"],
  "description":
    "Afrika ekonomisi, ticaret, ihracat ve yatırım gündemini Türk iş dünyası için Türkçe sunan haber platformu.",
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  "url": SITE_URL,
  "name": "Afrika Haberleri",
  "inLanguage": "tr",
  "publisher": { "@id": `${SITE_URL}/#organization` },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteSchema) }}
      />
      <HomeBody page={1} />
    </>
  );
}
