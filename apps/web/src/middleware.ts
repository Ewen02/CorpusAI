import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require creator authentication (Better Auth)
const protectedRoutes = ['/dashboard', '/ais', '/settings', '/onboarding'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/sign-in', '/sign-up'];

// Portal routes that are auth pages — must NOT be protected
const portalAuthRoutes = ['/portal/sign-in', '/portal/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ——— Portal end-user auth ———
  // Protect all /portal/* except the auth pages themselves
  const isPortalRoute = pathname.startsWith('/portal');
  const isPortalAuthRoute = portalAuthRoutes.some((route) => pathname.startsWith(route));
  const isPortalProtected = isPortalRoute && !isPortalAuthRoute;
  if (isPortalProtected) {
    const euSession = request.cookies.get('eu_session')?.value;
    if (!euSession) {
      const signInUrl = new URL('/portal/sign-in', request.url);
      signInUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // ——— Creator auth ———
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  const isAuthenticated = !!sessionToken;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (isProtectedRoute && !isAuthenticated) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
