import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const iconBoxVariants = cva(
  'flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]',
  {
    variants: {
      size: {
        sm: 'h-7 w-7',
        md: 'h-8 w-8',
        lg: 'h-10 w-10',
        xl: 'h-14 w-14',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

export interface IconBoxProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof iconBoxVariants> {
  children: React.ReactNode;
}

export function IconBox({ size, className, children, ...props }: IconBoxProps) {
  return (
    <div className={cn(iconBoxVariants({ size }), className)} {...props}>
      {children}
    </div>
  );
}
