import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  basePath: '/auth',
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
