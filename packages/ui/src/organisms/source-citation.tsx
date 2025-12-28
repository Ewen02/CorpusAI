'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Badge } from '../atoms/badge';
import { Button } from '../atoms/button';
import { Skeleton } from '../atoms/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../molecules/card';

// ============================================
// Types
// ============================================

export interface Source {
  documentId: string;
  documentName: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber?: number;
  chunkIndex?: number;
}

export interface SourceCitationProps {
  sources: Source[];
  onSourceClick?: (source: Source) => void;
  maxExcerptLength?: number;
  showRelevanceScore?: boolean;
  title?: string;
  className?: string;
}

export interface SourceCitationCardProps {
  source: Source;
  index: number;
  onClick?: () => void;
  maxExcerptLength?: number;
  showRelevanceScore?: boolean;
}

// ============================================
// Helpers
// ============================================

function getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function getConfidenceColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'bg-green-500/20 text-green-400';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'low':
      return 'bg-red-500/20 text-red-400';
  }
}

function truncateExcerpt(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || 'FILE';
}

// ============================================
// Sub-components
// ============================================

function SourceCitationCard({
  source,
  index,
  onClick,
  maxExcerptLength = 200,
  showRelevanceScore = true,
}: SourceCitationCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const confidenceLevel = getConfidenceLevel(source.relevanceScore);
  const needsTruncation = source.excerpt.length > maxExcerptLength;

  const displayedExcerpt = isExpanded
    ? source.excerpt
    : truncateExcerpt(source.excerpt, maxExcerptLength);

  return (
    <div
      className={cn(
        'group relative p-4 rounded-lg border border-border bg-card transition-colors',
        onClick && 'cursor-pointer hover:bg-accent/50'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-medium shrink-0">
            {index + 1}
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">
              {source.documentName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {getFileExtension(source.documentName)}
          </Badge>
          {source.pageNumber && (
            <Badge variant="outline" className="text-xs">
              p.{source.pageNumber}
            </Badge>
          )}
        </div>
      </div>

      {/* Excerpt */}
      <blockquote className="pl-3 border-l-2 border-primary/30 text-sm text-muted-foreground italic">
        "{displayedExcerpt}"
      </blockquote>

      {needsTruncation && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? 'Voir moins' : 'Voir plus'}
        </Button>
      )}

      {/* Footer */}
      {showRelevanceScore && (
        <div className="flex items-center justify-end mt-2">
          <Badge className={cn('text-xs', getConfidenceColor(confidenceLevel))}>
            {Math.round(source.relevanceScore * 100)}% pertinent
          </Badge>
        </div>
      )}
    </div>
  );
}

// ============================================
// Inline Citation (for use within messages)
// ============================================

export interface InlineCitationProps {
  sources: Source[];
  onSourceClick?: (source: Source) => void;
}

export function InlineCitation({ sources, onSourceClick }: InlineCitationProps) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {sources.map((source, index) => (
        <button
          key={`${source.documentId}-${index}`}
          onClick={() => onSourceClick?.(source)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
            'bg-primary/10 text-primary hover:bg-primary/20 transition-colors'
          )}
        >
          <span className="font-medium">[{index + 1}]</span>
          <span className="truncate max-w-[150px]">{source.documentName}</span>
          {source.pageNumber && <span className="text-muted-foreground">p.{source.pageNumber}</span>}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function SourceCitation({
  sources,
  onSourceClick,
  maxExcerptLength = 200,
  showRelevanceScore = true,
  title = 'Sources',
  className,
}: SourceCitationProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <BookIcon className="h-4 w-4" />
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {sources.length} source{sources.length > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.map((source, index) => (
          <SourceCitationCard
            key={`${source.documentId}-${index}`}
            source={source}
            index={index}
            onClick={onSourceClick ? () => onSourceClick(source) : undefined}
            maxExcerptLength={maxExcerptLength}
            showRelevanceScore={showRelevanceScore}
          />
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================
// Icons
// ============================================

function FileIcon({ className }: { className?: string }) {
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
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

// ============================================
// Skeleton Loader
// ============================================

export function SourceCitationSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-12 ml-auto" />
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="flex justify-end mt-2">
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
