import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isLogin = path.startsWith('/login');

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return response;
}

export const config = {
  // run on everything except static assets, the health check, machine-to-machine
  // routes (cron, webhooks) that authenticate via their own bearer token/signature,
  // and the public self-registration surface (token-validated, not session-based).
  // "branding" is here too: public/branding/* (logo) must load on the login page
  // for a signed-out visitor — without this exclusion the image request itself
  // got redirected to /login, so it silently never rendered.
  // Note: "register" and "registration" diverge at their 7th character ('e' vs 'r'),
  // so this does NOT accidentally exclude /registration or /api/registration/* —
  // verified before relying on it.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|branding|api/health|api/cron|api/webhooks|register|api/register).*)'],
};