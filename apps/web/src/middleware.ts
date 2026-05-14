import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

// Portal routes that are auth pages — must NOT be protected
const portalAuthPaths = ['/portal/sign-in', '/portal/auth'];

// Creator dashboard prefixes that require an authenticated session
const creatorProtectedPrefixes = [
  '/dashboard',
  '/ais',
  '/settings',
  '/analytics',
  '/onboarding',
  '/admin',
];

// Better Auth cookie names. When API runs on the same eTLD+1, the session cookie
// is visible; we use it as a fast-path gate. When the API is on a different domain,
// the cookie is invisible — we fall back to the client-side gate in the dashboard layout.
// To still get a server-side defense-in-depth, we require at least one auth cookie marker.
const creatorAuthCookies = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
  'creator.session',
];

/**
 * Strip locale prefix from pathname to get the "logical" path.
 */
function stripLocale(pathname: string): string {
  const match = pathname.match(/^\/(fr|en)(\/.*)?$/);
  return match ? match[2] || '/' : pathname;
}

function hasCreatorAuthCookie(request: NextRequest): boolean {
  return creatorAuthCookies.some((name) => Boolean(request.cookies.get(name)?.value));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = intlMiddleware(request);

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

  // ——— Creator dashboard auth (best-effort server-side gate) ———
  // If the session cookie is visible (same eTLD+1 deployment), enforce it here.
  // If it isn't (cross-domain API), the dashboard layout still enforces client-side.
  const isCreatorProtected = creatorProtectedPrefixes.some((p) => logicalPath.startsWith(p));
  if (isCreatorProtected && !hasCreatorAuthCookie(request)) {
    const locale = pathname.split('/')[1] === 'en' ? 'en' : 'fr';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    signInUrl.searchParams.set('callbackUrl', logicalPath);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)'],
};
