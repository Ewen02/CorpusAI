'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DashboardLayout,
  DashboardLayoutSkeleton,
  type NavItem,
  type AINavItem,
  type UserData,
} from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { useAIs } from '@/lib/queries';
import { useRouter } from '@/i18n/routing';
import {
  HomeIcon,
  BotIcon,
  ChartIcon,
  SettingsIcon,
  BookIcon,
  ShieldIcon,
  CompassIcon,
} from '@/lib/icons';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const t = useTranslations('nav');
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  // Client-side auth gate: middleware cannot see the session cookie when API
  // and web run on different domains (e.g. Railway + Vercel).
  // next-intl's router auto-prefixes the current locale, so we pass bare paths.
  React.useEffect(() => {
    if (!isPending && !session) {
      const strippedPath = pathname.replace(/^\/(fr|en)(?=\/|$)/, '') || '/';
      router.replace(`/sign-in?callbackUrl=${encodeURIComponent(strippedPath)}`);
    }
  }, [isPending, session, pathname, router]);

  const { data: aisData } = useAIs();

  const mainNavItems: NavItem[] = React.useMemo(
    () => [
      {
        id: 'dashboard',
        label: t('dashboard'),
        href: '/dashboard',
        icon: <HomeIcon className="h-4 w-4" />,
      },
      {
        id: 'ais',
        label: t('myAIs'),
        href: '/ais',
        icon: <BotIcon className="h-4 w-4" />,
      },
      {
        id: 'analytics',
        label: t('analytics'),
        href: '/analytics',
        icon: <ChartIcon className="h-4 w-4" />,
      },
      {
        id: 'explore',
        label: t('explore'),
        href: '/explore',
        icon: <CompassIcon className="h-4 w-4" />,
      },
    ],
    [t]
  );

  const adminNavItem: NavItem = React.useMemo(
    () => ({
      id: 'admin',
      label: t('admin'),
      href: '/admin',
      icon: <ShieldIcon className="h-4 w-4" />,
    }),
    [t]
  );

  const bottomNavItems: NavItem[] = React.useMemo(
    () => [
      {
        id: 'settings',
        label: t('settings'),
        href: '/settings',
        icon: <SettingsIcon className="h-4 w-4" />,
      },
      {
        id: 'docs',
        label: t('documentation'),
        href: '/docs/api',
        icon: <BookIcon className="h-4 w-4" />,
      },
    ],
    [t]
  );

  const aiItems: AINavItem[] = React.useMemo(() => {
    if (!aisData) return [];
    return aisData.map((ai) => ({
      id: ai.id,
      name: ai.name,
      href: `/ais/${ai.id}`,
      status: ai.status === 'ACTIVE' ? 'active' : ai.status === 'DRAFT' ? 'draft' : 'paused',
    }));
  }, [aisData]);

  const user: UserData = React.useMemo(
    () => ({
      name: session?.user?.name || 'User',
      email: session?.user?.email || '',
      plan: 'FREE' as const,
    }),
    [session?.user?.name, session?.user?.email]
  );

  const handleNavigate = React.useCallback(
    (href: string) => {
      if (href.startsWith('http')) {
        window.open(href, '_blank');
      } else {
        router.push(href);
      }
    },
    [router]
  );

  const handleCreateAI = React.useCallback(() => {
    router.push('/ais/new');
  }, [router]);

  const handleUpgrade = React.useCallback(() => {
    router.push('/settings/billing');
  }, [router]);

  const handleSignOut = React.useCallback(async () => {
    await authClient.signOut();
    router.push('/sign-in');
  }, [router]);

  if (isPending || !session) {
    return <DashboardLayoutSkeleton />;
  }

  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === 'ADMIN';
  const navItems = isAdmin ? [...mainNavItems, adminNavItem] : mainNavItems;

  return (
    <DashboardLayout
      navItems={navItems}
      aiItems={aiItems}
      bottomNavItems={bottomNavItems}
      user={user}
      currentPath={pathname}
      onNavigate={handleNavigate}
      onCreateAI={handleCreateAI}
      onUpgrade={handleUpgrade}
      onSignOut={handleSignOut}
      logo={<LanguageSwitcher />}
      labels={{
        myAIs: t('myAIs'),
        createAI: t('createAI'),
        signOut: t('signOut'),
        planLabels: {
          FREE: t('planFree'),
          CREATOR: 'Creator',
          PRO: 'Pro',
          ENTERPRISE: 'Enterprise',
        },
      }}
    >
      {children}
    </DashboardLayout>
  );
}
