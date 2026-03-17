import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CorpusAI Widget',
  description: 'AI assistant powered by CorpusAI',
  robots: { index: false, follow: false },
};

/**
 * Minimal layout for embed widget.
 * No sidebar, no navigation - just the chat interface.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
