'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardLayout, DashboardLayoutSkeleton, type NavItem, type AINavItem, type UserData } from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';

// Types for API responses
interface AIResponse {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}

// Icons as components
function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

// Navigation items
const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
  { id: 'ais', label: 'Mes AIs', href: '/ais', icon: <BotIcon /> },
  { id: 'analytics', label: 'Analytics', href: '/analytics', icon: <ChartIcon /> },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', href: '/settings', icon: <SettingsIcon /> },
  { id: 'docs', label: 'Documentation', href: 'https://docs.corpusai.com', icon: <BookIcon /> },
];

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const [aiItems, setAiItems] = React.useState<AINavItem[]>([]);
  const [isLoadingAIs, setIsLoadingAIs] = React.useState(true);

  // Fetch user's AIs
  React.useEffect(() => {
    const fetchAIs = async () => {
      try {
        const response = await fetch('http://localhost:3001/ais', {
          credentials: 'include',
        });
        if (response.ok) {
          const data: AIResponse[] = await response.json();
          setAiItems(
            data.map((ai) => ({
              id: ai.id,
              name: ai.name,
              href: `/ais/${ai.id}`,
              status: ai.status === 'ACTIVE' ? 'active' : ai.status === 'DRAFT' ? 'draft' : 'paused',
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching AIs:', error);
      } finally {
        setIsLoadingAIs(false);
      }
    };

    if (session) {
      fetchAIs();
    } else {
      setIsLoadingAIs(false);
    }
  }, [session]);

  // User data from session
  const user: UserData = {
    name: session?.user?.name || 'Utilisateur',
    email: session?.user?.email || '',
    plan: 'FREE',
  };

  const handleNavigate = (href: string) => {
    if (href.startsWith('http')) {
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
  };

  const handleCreateAI = () => {
    router.push('/ais/new');
  };

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/sign-in');
  };

  // Show skeleton while loading session
  if (isPending) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <DashboardLayout
      navItems={mainNavItems}
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
