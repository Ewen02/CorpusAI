'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  DashboardLayout,
  DashboardLayoutSkeleton,
  type NavItem,
  type AINavItem,
  type UserData,
} from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { useAIs } from '@/lib/queries';
import {
  HomeIcon,
  BotIcon,
  ChartIcon,
  SettingsIcon,
  BookIcon,
  ShieldIcon,
  CompassIcon,
} from '@/lib/icons';

// Navigation items
const mainNavItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <HomeIcon className="h-4 w-4" />,
  },
  { id: 'ais', label: 'Mes AIs', href: '/ais', icon: <BotIcon className="h-4 w-4" /> },
  {
    id: 'analytics',
    label: 'Analytics',
    href: '/analytics',
    icon: <ChartIcon className="h-4 w-4" />,
  },
  {
    id: 'explore',
    label: 'Explorer',
    href: '/explore',
    icon: <CompassIcon className="h-4 w-4" />,
  },
];

const adminNavItem: NavItem = {
  id: 'admin',
  label: 'Admin',
  href: '/admin',
  icon: <ShieldIcon className="h-4 w-4" />,
};

const bottomNavItems: NavItem[] = [
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: <SettingsIcon className="h-4 w-4" />,
  },
  {
    id: 'docs',
    label: 'Documentation',
    href: 'https://docs.corpusai.com',
    icon: <BookIcon className="h-4 w-4" />,
  },
];

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();

  // Fetch AIs using React Query hook
  const { data: aisData } = useAIs();

  // Convert AIs data to nav items
  const aiItems: AINavItem[] = React.useMemo(() => {
    if (!aisData) return [];
    return aisData.map((ai) => ({
      id: ai.id,
      name: ai.name,
      href: `/ais/${ai.id}`,
      status: ai.status === 'ACTIVE' ? 'active' : ai.status === 'DRAFT' ? 'draft' : 'paused',
    }));
  }, [aisData]);

  // User data from session - memoized to prevent unnecessary re-renders
  const user: UserData = React.useMemo(
    () => ({
      name: session?.user?.name || 'Utilisateur',
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

  // Show skeleton while loading session
  if (isPending) {
    return <DashboardLayoutSkeleton />;
  }

  // Add admin nav item if user is admin
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
    >
      {children}
    </DashboardLayout>
  );
}
