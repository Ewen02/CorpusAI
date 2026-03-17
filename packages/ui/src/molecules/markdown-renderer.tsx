'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

// Lazy-load SyntaxHighlighter + theme (~35KB gzipped) — only loaded when code blocks appear
const CodeBlock = React.lazy(() =>
  import('./code-block').then((mod) => ({ default: mod.CodeBlock }))
);

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-invert prose-sm max-w-none', className)}>
      <ReactMarkdown
        components={{
          // Code blocks with syntax highlighting
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const isInline = !match && !String(children).includes('\n');

            if (isInline) {
              return (
                <code
                  className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-slate-200"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <React.Suspense
                fallback={
                  <pre className="my-3 rounded-lg bg-slate-900 p-4 text-xs">
                    <code>{String(children)}</code>
                  </pre>
                }
              >
                <CodeBlock language={match?.[1] || 'text'}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              </React.Suspense>
            );
          },
          // Paragraphs with proper spacing
          p({ children }) {
            return <p className="mb-3 leading-relaxed last:mb-0">{children}</p>;
          },
          // Lists
          ul({ children }) {
            return <ul className="mb-3 list-disc space-y-1 pl-4">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="mb-3 list-decimal space-y-1 pl-4">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          // Headers (discouraged by prompt but handle gracefully)
          h3({ children }) {
            return <h3 className="mb-2 mt-4 font-semibold">{children}</h3>;
          },
          // Strong/Bold
          strong({ children }) {
            return <strong className="font-semibold text-slate-100">{children}</strong>;
          },
          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-primary underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
