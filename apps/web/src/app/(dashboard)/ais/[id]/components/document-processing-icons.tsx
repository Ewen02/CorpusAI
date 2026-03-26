import * as React from 'react';
import { CheckIcon } from '@corpusai/ui';

// ============================================
// Animated SVG icons for document processing steps
// Animations are defined in apps/web/src/app/globals.css
// ============================================

export function ParsingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="2"
        width="16"
        height="20"
        rx="2"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.5"
      />
      <line
        x1="7"
        y1="7"
        x2="17"
        y2="7"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="11"
        x2="15"
        y2="11"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="15"
        x2="17"
        y2="15"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.2"
        opacity="0.3"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="4"
        x2="19"
        y2="4"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ animation: 'scanLine 1.8s ease-in-out infinite' }}
      />
    </svg>
  );
}

export function ChunkingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="2"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.2)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce1 1.4s ease-in-out infinite' }}
      />
      <rect
        x="5"
        y="9"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.15)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce2 1.4s ease-in-out infinite' }}
      />
      <rect
        x="5"
        y="16"
        width="14"
        height="5"
        rx="1.5"
        fill="hsl(217 80% 60% / 0.1)"
        stroke="hsl(217 80% 60%)"
        strokeWidth="1"
        style={{ animation: 'chunkBounce3 1.4s ease-in-out infinite' }}
      />
    </svg>
  );
}

export function EmbeddingIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <line
        x1="12"
        y1="4"
        x2="5"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite' }}
      />
      <line
        x1="12"
        y1="4"
        x2="19"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.2s' }}
      />
      <line
        x1="5"
        y1="12"
        x2="19"
        y2="12"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.4s' }}
      />
      <line
        x1="5"
        y1="12"
        x2="9"
        y2="20"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.3s' }}
      />
      <line
        x1="19"
        y1="12"
        x2="15"
        y2="20"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'neuronLine 1.4s ease-in-out infinite', animationDelay: '0.5s' }}
      />
      <circle
        cx="12"
        cy="4"
        r="2.5"
        fill="hsl(217 80% 60%)"
        style={{ animation: 'neuronPulse 1.4s ease-in-out infinite', transformOrigin: '12px 4px' }}
      />
      <circle
        cx="5"
        cy="12"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.3s',
          transformOrigin: '5px 12px',
        }}
      />
      <circle
        cx="19"
        cy="12"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.5s',
          transformOrigin: '19px 12px',
        }}
      />
      <circle
        cx="9"
        cy="20"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.7s',
          transformOrigin: '9px 20px',
        }}
      />
      <circle
        cx="15"
        cy="20"
        r="2"
        fill="hsl(217 80% 60%)"
        style={{
          animation: 'neuronPulse 1.4s ease-in-out infinite',
          animationDelay: '0.9s',
          transformOrigin: '15px 20px',
        }}
      />
    </svg>
  );
}

export function StoringIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="18"
        rx="8"
        ry="2.5"
        fill="hsl(217 80% 60%)"
        fillOpacity="0.2"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
        style={{ animation: 'dbPulse 2s ease-in-out infinite' }}
      />
      <rect x="4" y="13" width="16" height="5" fill="hsl(217 80% 60% / 0.08)" stroke="none" />
      <ellipse
        cx="12"
        cy="13"
        rx="8"
        ry="2.5"
        fill="hsl(217 80% 60%)"
        fillOpacity="0.15"
        stroke="hsl(217 80% 65%)"
        strokeWidth="1.2"
      />
      <line x1="4" y1="13" x2="4" y2="18" stroke="hsl(217 80% 65%)" strokeWidth="1.2" />
      <line x1="20" y1="13" x2="20" y2="18" stroke="hsl(217 80% 65%)" strokeWidth="1.2" />
      <g style={{ animation: 'dropIn 1.8s ease-in-out infinite' }}>
        <rect
          x="9"
          y="2"
          width="6"
          height="7"
          rx="1"
          fill="hsl(217 80% 60% / 0.3)"
          stroke="hsl(217 80% 65%)"
          strokeWidth="1"
        />
        <line
          x1="10.5"
          y1="4"
          x2="13.5"
          y2="4"
          stroke="hsl(217 80% 70%)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
        <line
          x1="10.5"
          y1="6"
          x2="12.5"
          y2="6"
          stroke="hsl(217 80% 70%)"
          strokeWidth="0.8"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export const STEP_ICONS: Array<() => React.JSX.Element> = [
  ParsingIcon,
  ChunkingIcon,
  EmbeddingIcon,
  StoringIcon,
];

export function StepCompletedIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
      <CheckIcon className="h-3 w-3 text-green-400" />
    </div>
  );
}

export function StepPendingIcon() {
  return <div className="h-3 w-3 rounded-full bg-muted-foreground/20" />;
}
