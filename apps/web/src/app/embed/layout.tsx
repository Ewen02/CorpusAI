import type { Metadata } from 'next';
import '../globals.css';

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
  return (
    <html lang="fr" className="dark">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
