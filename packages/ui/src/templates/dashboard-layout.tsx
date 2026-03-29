'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/avatar';
import { Skeleton } from '../atoms/skeleton';

// ============================================
// Types
// ============================================

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface AINavItem {
  id: string;
  name: string;
  href: string;
  status: 'active' | 'draft' | 'paused';
}

export interface UserData {
  name: string;
  email: string;
  avatar?: string;
  plan: 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE';
}

export interface DashboardLayoutLabels {
  myAIs?: string;
  createAI?: string;
  signOut?: string;
  planLabels?: Record<string, string>;
}

export interface DashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  aiItems?: AINavItem[];
  bottomNavItems?: NavItem[];
  user: UserData;
  currentPath: string;
  onNavigate: (href: string) => void;
  onCreateAI?: () => void;
  onUpgrade?: () => void;
  onSignOut?: () => void;
  logo?: React.ReactNode;
  labels?: DashboardLayoutLabels;
}

// ============================================
// Context
// ============================================

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within DashboardLayout');
  }
  return context;
}

// ============================================
// Plan label helper
// ============================================

const DEFAULT_PLAN_LABELS: Record<UserData['plan'], string> = {
  FREE: 'Plan gratuit',
  CREATOR: 'Creator',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

// ============================================
// Sub-components
// ============================================

function SidebarHeader({
  logo,
  user,
  labels,
}: {
  logo?: React.ReactNode;
  user: UserData;
  labels?: DashboardLayoutLabels;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-[60px] shrink-0 items-center px-3">
      <div className={cn('flex min-w-0 items-center gap-3', isCollapsed && 'justify-center')}>
        {logo || (
          <div className="shadow-accent-sm relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 ring-1 ring-[hsl(var(--accent-500)/0.3)]">
            <span className="relative z-10 text-sm font-bold tracking-tight text-white">C</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-white/15 to-transparent" />
          </div>
        )}
        {!isCollapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold leading-none tracking-tight text-foreground">
              CorpusAI
            </span>
            <span className="text-tx-muted mt-[3px] text-[11px] leading-none">
              {labels?.planLabels?.[user.plan] ?? DEFAULT_PLAN_LABELS[user.plan]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function SidebarNav({
  items,
  currentPath,
  onNavigate,
  title,
}: {
  items: NavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  title?: string;
}) {
  const { isCollapsed, setIsMobileOpen } = useSidebar();

  const handleClick = (href: string) => {
    onNavigate(href);
    setIsMobileOpen(false);
  };

  return (
    <div className="px-2 py-1">
      {title && !isCollapsed && (
        <p className="text-tx-disabled mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
          {title}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== '/dashboard' && currentPath.startsWith(item.href + '/'));
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.href)}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-all duration-100',
                isCollapsed && 'justify-center px-2',
                isActive
                  ? 'text-tx-primary bg-[hsl(var(--accent-500)/0.1)] font-medium shadow-[inset_2px_0_0_hsl(var(--accent-500))]'
                  : 'text-tx-muted hover:bg-surface-2 hover:text-tx-secondary'
              )}
            >
              <span
                className={cn(
                  'shrink-0 transition-all duration-100',
                  isActive ? 'text-indigo-400 opacity-100' : 'opacity-60 group-hover:opacity-90'
                )}
              >
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="bg-surface-2 text-tx-muted ml-auto rounded-full border border-[hsl(var(--border-default))] px-1.5 py-0.5 text-[10px] tabular-nums">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const statusBg: Record<AINavItem['status'], string> = {
  active: 'bg-[hsl(var(--success)/0.15)] text-success',
  draft: 'bg-[hsl(var(--warning)/0.15)] text-warning',
  paused: 'bg-surface-3 text-tx-disabled',
};

const statusDot: Record<AINavItem['status'], string> = {
  active: 'bg-success animate-pulse',
  draft: 'bg-warning',
  paused: 'bg-tx-disabled/40',
};

function SidebarAIList({
  items,
  currentPath,
  onNavigate,
  onCreateAI,
  labels,
}: {
  items: AINavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  onCreateAI?: () => void;
  labels?: DashboardLayoutLabels;
}) {
  const { isCollapsed, setIsMobileOpen } = useSidebar();

  if (isCollapsed) return null;

  const handleClick = (href: string) => {
    onNavigate(href);
    setIsMobileOpen(false);
  };

  return (
    <div className="px-2 py-1">
      {/* Section header */}
      <div className="mb-1 flex items-center justify-between px-2 py-1">
        <p className="text-tx-disabled text-[10px] font-semibold uppercase tracking-[0.08em]">
          {labels?.myAIs ?? 'Mes AIs'}
        </p>
        {items.length > 0 && (
          <span className="text-tx-disabled text-[10px] tabular-nums">{items.length}</span>
        )}
      </div>

      {/* AI items — scroll si plus de 6 */}
      <nav className="max-h-[200px] space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = currentPath.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.href)}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-[7px] text-sm transition-all duration-100',
                isActive
                  ? 'text-tx-primary bg-[hsl(var(--accent-500)/0.1)] shadow-[inset_2px_0_0_hsl(var(--accent-500))]'
                  : 'text-tx-muted hover:bg-surface-2 hover:text-tx-secondary'
              )}
            >
              {/* Avatar initiale colorée selon status */}
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[10px] font-semibold',
                  statusBg[item.status]
                )}
              >
                {item.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-left text-[13px]">{item.name}</span>
              {/* Status dot */}
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusDot[item.status])} />
            </button>
          );
        })}
      </nav>

      {/* Bouton créer — dashed border */}
      {onCreateAI && (
        <button
          onClick={onCreateAI}
          className="text-tx-disabled hover:text-tx-muted mt-1 flex w-full items-center gap-2.5 rounded-md border border-dashed border-[hsl(var(--border-subtle))] px-2.5 py-[7px] text-[13px] transition-all duration-100 hover:border-[hsl(var(--border-default))]"
        >
          <PlusIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{labels?.createAI ?? 'Créer un AI'}</span>
        </button>
      )}
    </div>
  );
}

function SidebarUser({
  user,
  onSignOut,
  labels,
}: {
  user: UserData;
  onSignOut?: () => void;
  labels?: DashboardLayoutLabels;
}) {
  const { isCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="p-2">
      {/* User row */}
      <div
        className={cn(
          'hover:bg-surface-2 flex cursor-pointer items-center gap-2.5 rounded-md p-2 transition-all duration-100',
          isCollapsed && 'justify-center'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-7 w-7 shrink-0 ring-1 ring-[hsl(var(--border-default))]">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-[hsl(var(--accent-500)/0.15)] text-[11px] font-semibold text-indigo-400">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!isCollapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-tx-primary truncate text-[13px] font-medium leading-none">
                {user.name}
              </p>
              <p className="text-tx-disabled mt-[3px] truncate text-[11px] leading-none">
                {user.email}
              </p>
            </div>
            <ChevronDownIcon
              className={cn(
                'text-tx-disabled h-3.5 w-3.5 shrink-0 transition-transform duration-150',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </div>

      {/* Logout dropdown */}
      {isOpen && !isCollapsed && (
        <div className="animate-scale-in bg-surface-2 mt-1 rounded-md border border-[hsl(var(--border-default))] p-1 shadow-md">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-tx-muted hover:bg-surface-3 hover:text-tx-primary flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] transition-colors duration-100"
            >
              <LogOutIcon className="text-danger/70 h-3.5 w-3.5" />
              <span>{labels?.signOut ?? 'Déconnexion'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({
  navItems,
  aiItems,
  bottomNavItems,
  user,
  currentPath,
  onNavigate,
  onCreateAI,
  onSignOut,
  logo,
  labels,
}: Omit<DashboardLayoutProps, 'children' | 'onUpgrade'>) {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-surface-1 fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[hsl(var(--border-subtle))]',
          'transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
          isCollapsed ? 'w-[60px]' : 'w-[240px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarHeader logo={logo} user={user} labels={labels} />

        {/* Separator under header */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[hsl(var(--border-subtle))] to-transparent" />

        {/* Scrollable nav area */}
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav items={navItems} currentPath={currentPath} onNavigate={onNavigate} />

          {aiItems && aiItems.length > 0 && (
            <>
              <div className="mx-3 my-2 h-px bg-gradient-to-r from-transparent via-[hsl(var(--border-subtle))] to-transparent" />
              <SidebarAIList
                items={aiItems}
                currentPath={currentPath}
                onNavigate={onNavigate}
                onCreateAI={onCreateAI}
                labels={labels}
              />
            </>
          )}
        </div>

        {/* Bottom nav (Settings, Docs) */}
        {bottomNavItems && bottomNavItems.length > 0 && (
          <>
            <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[hsl(var(--border-subtle))] to-transparent" />
            <SidebarNav items={bottomNavItems} currentPath={currentPath} onNavigate={onNavigate} />
          </>
        )}

        {/* Separator before user footer */}
        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[hsl(var(--border-subtle))] to-transparent" />

        <SidebarUser user={user} onSignOut={onSignOut} labels={labels} />

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-surface-2 text-tx-muted hover:bg-surface-3 hover:text-tx-primary absolute -right-3 top-[72px] hidden h-6 w-6 items-center justify-center rounded-full border border-[hsl(var(--border-default))] shadow-sm transition-all duration-150 lg:flex"
        >
          <ChevronIcon
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[hsl(var(--border-subtle))] bg-background/80 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <button
        onClick={onMenuClick}
        className="text-tx-muted hover:bg-surface-2 hover:text-tx-primary rounded-md p-1.5 transition-colors lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

// ============================================
// Main Component
// ============================================

export function DashboardLayout({
  children,
  navItems,
  aiItems,
  bottomNavItems,
  user,
  currentPath,
  onNavigate,
  onCreateAI,
  onUpgrade,
  onSignOut,
  logo,
  labels,
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) {
      setIsCollapsed(stored === 'true');
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}>
      <div className="min-h-screen bg-background">
        <Sidebar
          navItems={navItems}
          aiItems={aiItems}
          bottomNavItems={bottomNavItems}
          user={user}
          currentPath={currentPath}
          onNavigate={onNavigate}
          onCreateAI={onCreateAI}
          onSignOut={onSignOut}
          logo={logo}
          labels={labels}
        />

        <div
          className={cn(
            'transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
            isCollapsed ? 'lg:pl-[60px]' : 'lg:pl-[240px]'
          )}
        >
          <Header onMenuClick={() => setIsMobileOpen(true)} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

// ============================================
// Icons (local SVGs — no external dep)
// ============================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

// ============================================
// Skeleton
// ============================================

export function DashboardLayoutSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="bg-surface-1 hidden w-[240px] flex-col border-r border-[hsl(var(--border-subtle))] lg:flex">
        {/* Header */}
        <div className="flex h-[60px] items-center gap-3 px-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-2.5 w-14" />
          </div>
        </div>

        <div className="bg-surface-2 mx-3 h-px" />

        {/* Nav items */}
        <div className="flex-1 space-y-0.5 p-2 pt-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
          <div className="bg-surface-2 mx-1 my-3 h-px" />
          <Skeleton className="mb-1.5 h-2.5 w-16" />
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>

        {/* Bottom */}
        <div className="bg-surface-2 mx-3 h-px" />
        <div className="space-y-0.5 p-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>

        <div className="bg-surface-2 mx-3 h-px" />

        {/* User */}
        <div className="flex items-center gap-2.5 p-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <header className="h-14 border-b border-[hsl(var(--border-subtle))]" />
        <main className="p-6">
          <Skeleton className="mb-6 h-7 w-40" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
