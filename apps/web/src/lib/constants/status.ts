import type { AIStatus, DocumentStatus } from '@corpusai/types';

interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  dot?: string;
  color?: string;
}

export const AI_STATUS_CONFIG: Record<AIStatus, StatusConfig> = {
  ACTIVE: { label: 'Actif', variant: 'default', dot: 'bg-green-500' },
  DRAFT: { label: 'Brouillon', variant: 'secondary', dot: 'bg-yellow-500' },
  PAUSED: { label: 'En pause', variant: 'secondary', dot: 'bg-gray-500' },
  ARCHIVED: { label: 'Archivé', variant: 'secondary', dot: 'bg-gray-400' },
};

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, StatusConfig & { badgeClass: string }> =
  {
    PENDING: {
      label: 'En attente',
      variant: 'secondary',
      color: 'text-yellow-500',
      badgeClass: 'bg-yellow-500/20 text-yellow-400',
    },
    PROCESSING: {
      label: 'Analyse en cours',
      variant: 'secondary',
      color: 'text-blue-500',
      badgeClass: 'bg-blue-500/20 text-blue-400',
    },
    INDEXED: {
      label: 'Prêt',
      variant: 'default',
      color: 'text-green-500',
      badgeClass: 'bg-green-500/20 text-green-400',
    },
    FAILED: {
      label: 'Erreur',
      variant: 'destructive',
      color: 'text-red-500',
      badgeClass: 'bg-red-500/20 text-red-400',
    },
  };

export const AI_STATUS_BADGE_CLASS: Record<AIStatus, string> = {
  DRAFT: 'bg-yellow-500/20 text-yellow-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  PAUSED: 'bg-orange-500/20 text-orange-400',
  ARCHIVED: 'bg-muted text-muted-foreground',
};
