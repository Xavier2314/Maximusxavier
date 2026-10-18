import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/auth", "/privacy", "/offline", "/setup", "/w"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Not configured yet: send everything to the setup guide instead of crashing.
  if (!url || !key) {
    if (pathname.startsWith("/setup")) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session cookie. Must run before any redirect decision.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  if (user && (pathname === "/" || pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static files, images, the service worker, the manifest and cron/push/WhatsApp/payment-webhook APIs (they authenticate themselves).
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|brand/|icons/|api/cron|api/push/dispatch|api/payments/flutterwave/webhook|api/whatsapp|api/ai/status|api/client-error|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
