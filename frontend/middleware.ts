import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DELETED_HABER_SLUGS } from "@/lib/deleted-slugs";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
