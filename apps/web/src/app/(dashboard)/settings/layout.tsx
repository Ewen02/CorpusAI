'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@corpusai/ui';
import { useNavigation } from '@/lib/hooks';
import { ROUTES } from '@/lib/constants';
import { UserIcon, CreditCardIcon, ShieldIcon, BellIcon } from '@/lib/icons';

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
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { navigateTo } = useNavigation();

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Parametres</h1>
        <p className="text-muted-foreground mt-2">
          Gerez votre compte et vos preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-56 shrink-0">
          <ul className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <button
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
