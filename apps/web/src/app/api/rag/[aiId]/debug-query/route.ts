import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ aiId: string }> }) {
  // Get session token from cookies (Better Auth)
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('better-auth.session_token')?.value;

  if (!sessionToken) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { aiId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const apiUrl = process.env.API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/rag/${aiId}/debug-query?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: errorData.message || 'Server error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    Sentry.captureException(error, { extra: { route: 'debug-query', aiId } });
    return NextResponse.json({ message: 'Unable to connect to the server' }, { status: 500 });
  }
}
