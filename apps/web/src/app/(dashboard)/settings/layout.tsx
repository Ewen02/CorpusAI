'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@corpusai/ui';
import { useNavigation } from '@/lib/hooks';
import { ROUTES } from '@/lib/constants';
import { UserIcon, CreditCardIcon, ShieldIcon, BellIcon, KeyIcon } from '@/lib/icons';

interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const settingsNav: SettingsNavItem[] = [
  {
    label: 'Profil',
    href: ROUTES.settings.root,
    icon: <UserIcon className="h-4 w-4" />,
  },
  {
    label: 'Abonnement',
    href: ROUTES.settings.billing,
    icon: <CreditCardIcon className="h-4 w-4" />,
  },
  {
    label: 'Securite',
    href: ROUTES.settings.security,
    icon: <ShieldIcon className="h-4 w-4" />,
  },
  {
    label: 'Notifications',
    href: ROUTES.settings.notifications,
    icon: <BellIcon className="h-4 w-4" />,
  },
  {
    label: 'Cles API',
    href: ROUTES.settings.apiKeys,
    icon: <KeyIcon className="h-4 w-4" />,
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { navigateTo } = useNavigation();

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Parametres</h1>
        <p className="mt-2 text-muted-foreground">Gerez votre compte et vos preferences.</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="w-full shrink-0 md:w-56">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <button
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
