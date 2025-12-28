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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            C
          </div>
        )}
        {!isCollapsed && (
          <span className="font-semibold text-foreground">CorpusAI</span>
        )}
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
        <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full">
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
      <h3 className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusColors[item.status])} />
              <span className="flex-1 text-left truncate">{item.name}</span>
            </button>
          );
        })}
        {onCreateAI && (
          <button
            onClick={onCreateAI}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Créer un AI</span>
          </button>
        )}
      </nav>
    </div>
  );
}

function SidebarUser({
  user,
  onSignOut,
}: {
  user: UserData;
  onSignOut?: () => void;
}) {
  const { isCollapsed } = useSidebar();
  const [isOpen, setIsOpen] = React.useState(false);

  const planLabels = {
    FREE: 'Free',
    CREATOR: 'Creator',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
  };

  return (
    <div className="p-3 border-t border-border">
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg p-2 cursor-pointer hover:bg-accent transition-colors',
          isCollapsed && 'justify-center'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-primary/20 text-primary text-xs">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{planLabels[user.plan]}</p>
          </div>
        )}
      </div>
      {isOpen && !isCollapsed && onSignOut && (
        <div className="mt-2 space-y-1">
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full bg-card border-r border-border flex flex-col transition-all duration-300',
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
          className="hidden lg:flex absolute -right-3 top-20 h-6 w-6 items-center justify-center rounded-full border border-border bg-card hover:bg-accent transition-colors"
        >
          <ChevronIcon className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
        </button>
      </aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
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
    <SidebarContext.Provider
      value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}
    >
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

        <div
          className={cn(
            'transition-all duration-300',
            isCollapsed ? 'lg:pl-16' : 'lg:pl-72'
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <aside className="hidden lg:flex w-72 border-r border-border flex-col">
        <div className="p-4 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Separator />
        <div className="flex-1 p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </aside>

      {/* Content skeleton */}
      <div className="flex-1">
        <header className="h-14 border-b border-border" />
        <main className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
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
