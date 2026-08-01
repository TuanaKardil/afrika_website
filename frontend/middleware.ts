import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DELETED_HABER_SLUGS } from "@/lib/deleted-slugs";

// Listings whose pagination moved from "?sayfa=N" into the path, so they could
// prerender. Matched as a prefix so /bolge/x, /sektorler/x and /yazarlar/x are
// covered without listing every slug.
const PAGINATED_PREFIXES = [
  "/firsatlar",
  "/pazarlar-ekonomi",
  "/ticaret-ihracat",
  "/diger",
  "/turk-is-dunyasi",
  "/etkinlikler-fuarlar",
  "/bolge/",
  "/sektorler/",
  "/hashtag/",
  "/yazarlar/",
];

/**
 * 308s old "?sayfa=N" URLs onto the path form, dropping the query.
 *
 * This lives here rather than in next.config redirects() because Next appends
 * the original query string to the destination unless the destination declares
 * one itself. That made "?sayfa=1" redirect to itself forever: a real loop,
 * caught by curl reporting 5 redirects and no response.
 */
function paginationRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl;
  const sayfa = searchParams.get("sayfa");
  if (sayfa === null) return null;

  const isPaginated =
    pathname === "/" ||
    PAGINATED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`)
    );
  if (!isPaginated) return null;

  // Already on a path-form page and carrying a leftover "?sayfa": strip it.
  // Reachable from links minted by the earlier next.config version, which
  // appended the query to its own destination.
  if (/\/sayfa\/\d+\/?$/.test(pathname)) {
    const clean = request.nextUrl.clone();
    clean.searchParams.delete("sayfa");
    return NextResponse.redirect(clean, 308);
  }

  const page = Number(sayfa);
  const base = pathname === "/" ? "" : pathname.replace(/\/$/, "");
  const target = new URL(
    Number.isInteger(page) && page > 1 ? `${base}/sayfa/${page}` : base || "/",
    request.url
  );
  // No searchParams copied: carrying "sayfa" across is what created the loop.
  return NextResponse.redirect(target, 308);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const paginated = paginationRedirect(request);
  if (paginated) return paginated;

  // 410 Gone: tenders module permanently removed
  if (pathname.startsWith("/ihaleler")) {
    return new NextResponse(null, { status: 410 });
  }

  // 410 Gone: specific deleted articles confirmed via Google Search Console
  if (pathname.startsWith("/haber/")) {
    const slug = pathname.slice(7);
    if (DELETED_HABER_SLUGS.has(slug)) {
      return new NextResponse(null, { status: 410 });
    }
  }

  // Anonymous visitors (no Supabase auth cookie) have no session to refresh:
  // skip the auth round-trip entirely. This keeps the hot path fast for
  // readers and crawlers; auth-gated paths still redirect.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasAuthCookie) {
    if (pathname.startsWith("/panel")) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/giris";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/giris";
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin panel: only the designated admin email can access /admin/*
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!user || user.email !== adminEmail) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
