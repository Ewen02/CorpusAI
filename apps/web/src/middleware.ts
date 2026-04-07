import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Portal routes that are auth pages — must NOT be protected
const portalAuthPaths = ['/portal/sign-in', '/portal/auth'];

// NOTE: Creator auth (better-auth.session_token) is NOT checked here.
// When the API runs on a different eTLD+1 than the web app (e.g. Railway + Vercel),
// the session cookie is scoped to the API domain and is invisible to this middleware.
// Protection is done client-side in the dashboard layout via authClient.useSession().

/**
 * Strip locale prefix from pathname to get the "logical" path.
 * e.g. /fr/dashboard → /dashboard, /en/sign-in → /sign-in
 */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(fr|en)(\/.*)?$/);
  return match ? match[2] || '/' : pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let next-intl handle locale detection + redirect first
  const response = intlMiddleware(request);

  // After intl middleware, check auth on the locale-stripped path
  const logicalPath = stripLocale(pathname);

  // ——— Portal end-user auth ———
  const isPortalRoute = logicalPath.startsWith('/portal');
  const isPortalAuthRoute = portalAuthPaths.some((p) => logicalPath.startsWith(p));
  const isPortalProtected = isPortalRoute && !isPortalAuthRoute;
  if (isPortalProtected) {
    const euSession = request.cookies.get('eu_session')?.value;
    if (!euSession) {
      const signInUrl = new URL(`/${pathname.split('/')[1]}/portal/sign-in`, request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Creator auth (sign-in / protected routes) is handled client-side —
  // see apps/web/src/app/[locale]/(dashboard)/layout.tsx
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
};
