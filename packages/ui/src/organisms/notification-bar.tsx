'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
import { CheckIcon, ChevronRightIcon, XIcon } from '../atoms/icons';

export interface NotificationBarItem {
  icon: 'check' | 'arrow';
  label: string;
  onClick?: () => void;
}

export interface NotificationBarProps {
  title: string;
  items: NotificationBarItem[];
  onClose: () => void;
  className?: string;
}

export function NotificationBar({ title, items, onClose, className }: NotificationBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5', className)}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Titre */}
        <div className="flex shrink-0 items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 text-primary"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>

        {/* Séparateur vertical */}
        <span className="hidden h-4 w-px shrink-0 bg-border sm:block" />

        {/* Items */}
        {items.map((item, index) =>
          item.onClick ? (
            <Button
              key={index}
              variant="link"
              size="sm"
              className="h-auto gap-1.5 p-0 text-sm"
              onClick={item.onClick}
            >
              {item.icon === 'check' ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 shrink-0" />
              )}
              {item.label}
            </Button>
          ) : (
            <span key={index} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {item.icon === 'check' ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--success))]" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              {item.label}
            </span>
          )
        )}

        {/* ✕ Fermer */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-7 w-7 shrink-0"
          onClick={onClose}
          aria-label="Fermer"
        >
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
