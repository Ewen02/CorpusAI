import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const iconVariants = cva(
  'flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 font-bold text-white ring-1 ring-[hsl(var(--primary)/0.3)]',
  {
    variants: {
      size: {
        sm: 'h-6 w-6 text-[10px] rounded-md',
        md: 'h-7 w-7 text-[11px]',
        lg: 'h-8 w-8 text-sm',
        xl: 'h-10 w-10 text-lg rounded-xl',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

const textVariants = cva('font-semibold tracking-tight', {
  variants: {
    size: {
      sm: 'text-[13px]',
      md: 'text-[14px]',
      lg: 'text-[15px]',
      xl: 'text-xl',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface LogoProps extends VariantProps<typeof iconVariants> {
  showText?: boolean;
  className?: string;
}

export function Logo({ size, showText = true, className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={iconVariants({ size })}>
        <span className="relative z-10">C</span>
      </div>
      {showText && <span className={cn(textVariants({ size }), 'text-tx-primary')}>CorpusAI</span>}
    </div>
  );
}
