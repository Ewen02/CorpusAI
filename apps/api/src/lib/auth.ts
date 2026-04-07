import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';
import { prisma } from '@corpusai/database';
import { Logger } from '@nestjs/common';

const logger = new Logger('Auth');

// Shared cookie attributes for cross-site flows (Vercel web ↔ Railway API).
// SameSite=None + Secure + Partitioned (CHIPS) are all required for Safari ITP
// to store cookies set by the API domain when the top-level site is Vercel.
const crossSiteCookieAttributes = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  partitioned: process.env.NODE_ENV === 'production',
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  basePath: '/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    // Email verification requires RESEND_API_KEY + sendVerificationEmail config.
    // Enable only once email delivery is set up, otherwise sign-up throws 500.
    requireEmailVerification:
      process.env.NODE_ENV === 'production' && Boolean(process.env.RESEND_API_KEY),
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
  rateLimit: {
    window: 60 * 60, // 1 hour
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10 * 60, max: 20 }, // 20 attempts per 10 min
      '/sign-up/email': { window: 60 * 60, max: 20 },
      '/forgot-password': { window: 60 * 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  account: {
    // Cross-domain OAuth workaround (Railway API + Vercel web): Better Auth's
    // secondary state cookie check can't pass when the top-frame origin flips
    // mid-flow (vercel.app → google.com → railway.app). The primary DB-backed
    // state check in the `verification` table still runs and provides CSRF
    // protection together with PKCE and Google's redirect_uri allowlist.
    skipStateCookieCheck: process.env.NODE_ENV === 'production',
  },
  advanced: {
    // Cross-site session cookie (Vercel ↔ Railway). SameSite=None + Secure +
    // Partitioned (CHIPS) are required for Safari ITP to store and send it.
    defaultCookieAttributes: crossSiteCookieAttributes,
    cookies: {
      session_token: { attributes: crossSiteCookieAttributes },
    },
  },
  user: {
    additionalFields: {
      username: {
        type: 'string',
        required: false,
      },
      subscriptionPlan: {
        type: 'string',
        required: false,
        defaultValue: 'FREE',
      },
      subscriptionStatus: {
        type: 'string',
        required: false,
        defaultValue: 'ACTIVE',
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: 'CorpusAI',
    }),
  ],
  trustedOrigins: [process.env.FRONTEND_URL!],
  hooks: {
    // Better Auth's MiddlewareInputContext type is opaque — cast required to access request info
    after: async (ctx) => {
      const rawCtx = ctx as unknown as {
        context?: { request?: { url?: string; method?: string } };
      };
      const url = rawCtx.context?.request?.url;
      const method = rawCtx.context?.request?.method;
      if (url) {
        const path = new URL(url, 'http://localhost').pathname;
        const authPaths = ['/auth/sign-in/email', '/auth/sign-up/email', '/auth/sign-out'];
        if (authPaths.some((p) => path.endsWith(p))) {
          logger.log(`Auth event: ${method ?? '?'} ${path}`);
        }
      }
      return ctx;
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
