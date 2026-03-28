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
    label: 'Sécurité',
    href: ROUTES.settings.security,
    icon: <ShieldIcon className="h-4 w-4" />,
  },
  {
    label: 'Notifications',
    href: ROUTES.settings.notifications,
    icon: <BellIcon className="h-4 w-4" />,
  },
  {
    label: 'Clés API',
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
        <h1 className="text-2xl font-semibold tracking-tight text-tx-primary">Paramètres</h1>
        <p className="mt-1 text-sm text-tx-muted">Gérez votre compte et vos préférences.</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        {/* Sidebar Navigation */}
        <nav className="w-full shrink-0 md:w-52">
          <ul className="space-y-0.5">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <button
                    onClick={() => navigateTo(item.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150',
                      isActive
                        ? 'bg-[hsl(var(--accent-500)/0.08)] font-medium text-tx-primary shadow-[inset_2px_0_0_hsl(var(--accent-500))]'
                        : 'text-tx-muted hover:bg-[hsl(var(--surface-2))] hover:text-tx-secondary'
                    )}
                  >
                    <span
                      className={cn('shrink-0', isActive ? 'text-indigo-400' : 'text-tx-disabled')}
                    >
                      {item.icon}
                    </span>
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
