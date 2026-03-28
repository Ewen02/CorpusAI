import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Routes that require creator authentication (Better Auth)
const protectedPaths = [
  '/dashboard',
  '/ais',
  '/settings',
  '/onboarding',
  '/admin',
  '/analytics',
  '/explore',
];

// Routes that should redirect to dashboard if already authenticated
const authPaths = ['/sign-in', '/sign-up'];

// Portal routes that are auth pages — must NOT be protected
const portalAuthPaths = ['/portal/sign-in', '/portal/auth'];

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

  // ——— Creator auth ———
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  const isAuthenticated = !!sessionToken;

  const isProtectedRoute = protectedPaths.some((p) => logicalPath.startsWith(p));
  if (isProtectedRoute && !isAuthenticated) {
    const locale = pathname.split('/')[1] || 'fr';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const isAuthRoute = authPaths.some((p) => logicalPath.startsWith(p));
  if (isAuthRoute && isAuthenticated) {
    const locale = pathname.split('/')[1] || 'fr';
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
};
