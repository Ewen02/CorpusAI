'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div className={`animate-fade-in-up ${className ?? ''}`}>
      {children}
    </div>
  );
}
