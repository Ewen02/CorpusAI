import type { AICategory } from '@corpusai/types';

export interface AITemplate {
  id: string;
  icon: string;
  category: AICategory;
  color: string;
}

export const AI_TEMPLATES: AITemplate[] = [
  { id: 'support', icon: 'Headphones', category: 'SUPPORT', color: 'from-blue-400 to-blue-600' },
  {
    id: 'education',
    icon: 'GraduationCap',
    category: 'EDUCATION',
    color: 'from-emerald-400 to-emerald-600',
  },
  { id: 'legal', icon: 'Scale', category: 'LEGAL', color: 'from-amber-400 to-amber-600' },
  {
    id: 'finance',
    icon: 'TrendingUp',
    category: 'FINANCE',
    color: 'from-violet-400 to-violet-600',
  },
  { id: 'health', icon: 'Heart', category: 'HEALTH', color: 'from-rose-400 to-rose-600' },
  { id: 'tech', icon: 'Code', category: 'TECH', color: 'from-cyan-400 to-cyan-600' },
  { id: 'custom', icon: 'Sparkles', category: 'OTHER', color: 'from-gray-400 to-gray-600' },
];
