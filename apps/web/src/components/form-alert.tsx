'use client';

import * as React from 'react';
import { cn } from '@corpusai/ui';

export type FormAlertVariant = 'error' | 'success' | 'warning' | 'info';

interface FormAlertProps {
  message: string | null;
  variant?: FormAlertVariant;
  className?: string;
}

const variantStyles: Record<FormAlertVariant, string> = {
  error: 'bg-destructive/10 text-destructive',
  success: 'bg-green-500/10 text-green-500',
  warning: 'bg-yellow-500/10 text-yellow-500',
  info: 'bg-blue-500/10 text-blue-500',
};

/**
 * Reusable alert component for form feedback messages.
 * Returns null if message is null/empty.
 *
 * @example
 * <FormAlert message={error} variant="error" />
 * <FormAlert message={success} variant="success" />
 */
export const FormAlert = React.memo(function FormAlert({
  message,
  variant = 'error',
  className,
}: FormAlertProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'p-3 rounded-lg text-sm',
        variantStyles[variant],
        className
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {message}
    </div>
  );
});

/**
 * Shorthand components for common variants.
 */
export const ErrorAlert = React.memo(function ErrorAlert({
  message,
  className,
}: Omit<FormAlertProps, 'variant'>) {
  return <FormAlert message={message} variant="error" className={className} />;
});

export const SuccessAlert = React.memo(function SuccessAlert({
  message,
  className,
}: Omit<FormAlertProps, 'variant'>) {
  return <FormAlert message={message} variant="success" className={className} />;
});
