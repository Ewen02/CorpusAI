import * as React from 'react';
import { GoogleIcon, GitHubIcon, MailIcon, KeyIcon } from '@/lib/icons';

export interface ProviderInfo {
  name: string;
  icon: React.ReactNode;
  color: string;
}

export function getProviderInfo(providerId: string): ProviderInfo {
  switch (providerId) {
    case 'google':
      return {
        name: 'Google',
        icon: React.createElement(GoogleIcon, { className: 'h-5 w-5' }),
        color: 'text-red-500',
      };
    case 'github':
      return {
        name: 'GitHub',
        icon: React.createElement(GitHubIcon, { className: 'h-5 w-5' }),
        color: 'text-foreground',
      };
    case 'credential':
      return {
        name: 'Email & mot de passe',
        icon: React.createElement(MailIcon, { className: 'h-5 w-5' }),
        color: 'text-blue-500',
      };
    default:
      return {
        name: providerId,
        icon: React.createElement(KeyIcon, { className: 'h-5 w-5' }),
        color: 'text-muted-foreground',
      };
  }
}
