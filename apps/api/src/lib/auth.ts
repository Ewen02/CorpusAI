import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { twoFactor } from 'better-auth/plugins';
import { prisma } from '@corpusai/database';
import { Resend } from 'resend';
import { Logger } from '@nestjs/common';
import { verifyEmailTemplate, resetPasswordTemplate } from '@corpusai/email';

const logger = new Logger('Auth');

// Shared cookie attributes for cross-site flows (Vercel web ↔ Railway API).
const crossSiteCookieAttributes = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
};

// Lazy Resend instance — avoids creating one per callback invocation.
function getResend(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'noreply@corpusai.io';
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3001',
  basePath: '/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification:
      process.env.NODE_ENV === 'production' && Boolean(process.env.RESEND_API_KEY),
    sendResetPassword: async ({ user, url }) => {
      const resend = getResend();
      if (!resend) {
        logger.warn(`Reset password email not sent to ${user.email} (RESEND_API_KEY not set)`);
        return;
      }
      const { subject, html } = resetPasswordTemplate(url, user.name);
      await resend.emails.send({ from: getFromEmail(), to: user.email, subject, html });
      logger.log(`Reset password email sent to ${user.email}`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const resend = getResend();
      if (!resend) {
        logger.warn(`Verification email not sent to ${user.email} (RESEND_API_KEY not set)`);
        return;
      }
      const { subject, html } = verifyEmailTemplate(url, user.name);
      await resend.emails.send({ from: getFromEmail(), to: user.email, subject, html });
      logger.log(`Verification email sent to ${user.email}`);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
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
    window: 60 * 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 10 * 60, max: 20 },
      '/sign-up/email': { window: 60 * 60, max: 20 },
      '/forgot-password': { window: 60 * 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  account: {
    skipStateCookieCheck: process.env.NODE_ENV === 'production',
  },
  advanced: {
    defaultCookieAttributes: crossSiteCookieAttributes,
    cookies: {
      session_token: { attributes: crossSiteCookieAttributes },
    },
  },
  user: {
    additionalFields: {
      username: { type: 'string', required: false },
      subscriptionPlan: { type: 'string', required: false, defaultValue: 'FREE' },
      subscriptionStatus: { type: 'string', required: false, defaultValue: 'ACTIVE' },
      role: { type: 'string', required: false, defaultValue: 'USER' },
    },
  },
  plugins: [twoFactor({ issuer: 'CorpusAI' })],
  trustedOrigins: Array.from(
    new Set(
      [process.env.FRONTEND_URL!, ...(process.env.CORS_ORIGINS ?? '').split(',')]
        .map((o) => o.trim())
        .filter(Boolean)
    )
  ),
  hooks: {
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
