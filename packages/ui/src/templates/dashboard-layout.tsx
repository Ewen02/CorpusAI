'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/avatar';
import { Separator } from '../atoms/separator';
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
// Sub-components
// ============================================

function SidebarHeader({
  logo,
  user,
  onUpgrade,
}: {
  logo?: React.ReactNode;
  user: UserData;
  onUpgrade?: () => void;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2">
        {logo || (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            C
          </div>
        )}
        {!isCollapsed && <span className="font-semibold text-foreground">CorpusAI</span>}
      </div>
      {!isCollapsed && user.plan === 'FREE' && onUpgrade && (
        <Button variant="outline" size="sm" onClick={onUpgrade}>
          Upgrade
        </Button>
      )}
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
    <div className="px-3 py-2">
      {title && !isCollapsed && (
        <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      )}
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.href)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'border-l-2 border-primary bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs">
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

function SidebarAIList({
  items,
  currentPath,
  onNavigate,
  onCreateAI,
}: {
  items: AINavItem[];
  currentPath: string;
  onNavigate: (href: string) => void;
  onCreateAI?: () => void;
}) {
  const { isCollapsed, setIsMobileOpen } = useSidebar();

  if (isCollapsed) return null;

  const handleClick = (href: string) => {
    onNavigate(href);
    setIsMobileOpen(false);
  };

  const statusColors = {
    active: 'bg-green-500',
    draft: 'bg-yellow-500',
    paused: 'bg-gray-500',
  };

  return (
    <div className="px-3 py-2">
      <h3 className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Mes AIs
      </h3>
      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = currentPath.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.href)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  statusColors[item.status],
                  item.status === 'active' && 'ring-2 ring-green-500/20'
                )}
              />
              <span className="flex-1 truncate text-left">{item.name}</span>
            </button>
          );
        })}
        {onCreateAI && (
          <button
            onClick={onCreateAI}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-white/[0.04] hover:text-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Créer un AI</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function SidebarUser({ user, onSignOut }: { user: UserData; onSignOut?: () => void }) {
  const { isCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(false);

  const planLabels = {
    FREE: 'Free',
    CREATOR: 'Creator',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
  };

  return (
    <div className="border-t border-border p-3">
      <div
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-all duration-150 hover:bg-white/[0.04]',
          isCollapsed && 'justify-center'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-primary/20 text-xs text-primary">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{planLabels[user.plan]}</p>
          </div>
        )}
      </div>
      {isOpen && !isCollapsed && onSignOut && (
        <div className="mt-2 space-y-1">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-white/[0.04] hover:text-foreground"
          >
            <LogOutIcon className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
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
  onUpgrade,
  onSignOut,
  logo,
}: Omit<DashboardLayoutProps, 'children'>) {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/90 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-border bg-card transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarHeader logo={logo} user={user} onUpgrade={onUpgrade} />

        <Separator />

        <div className="flex-1 overflow-y-auto">
          <SidebarNav items={navItems} currentPath={currentPath} onNavigate={onNavigate} />

          {aiItems && aiItems.length > 0 && (
            <>
              <Separator className="my-2" />
              <SidebarAIList
                items={aiItems}
                currentPath={currentPath}
                onNavigate={onNavigate}
                onCreateAI={onCreateAI}
              />
            </>
          )}
        </div>

        {bottomNavItems && bottomNavItems.length > 0 && (
          <>
            <Separator />
            <SidebarNav items={bottomNavItems} currentPath={currentPath} onNavigate={onNavigate} />
          </>
        )}

        <SidebarUser user={user} onSignOut={onSignOut} />

        {/* Collapse toggle - desktop only */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent lg:flex"
        >
          <ChevronIcon
            className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
          />
        </button>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 transition-colors hover:bg-accent lg:hidden"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
      {/* Breadcrumb, search, notifications will be added here */}
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
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Persist collapsed state
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
          onUpgrade={onUpgrade}
          onSignOut={onSignOut}
          logo={logo}
        />

        <div className={cn('transition-all duration-300', isCollapsed ? 'lg:pl-16' : 'lg:pl-72')}>
          <Header onMenuClick={() => setIsMobileOpen(true)} />
          <main className="p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

// ============================================
// Icons
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
      {/* Sidebar skeleton */}
      <aside className="hidden w-72 flex-col border-r border-border lg:flex">
        <div className="flex items-center gap-2 p-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Separator />
        <div className="flex-1 space-y-2 p-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <div className="flex-1">
        <header className="h-14 border-b border-border" />
        <main className="p-6">
          <Skeleton className="mb-6 h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
