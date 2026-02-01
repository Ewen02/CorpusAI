import '../globals.css';

export const metadata = {
  title: 'CorpusAI Widget',
  description: 'Assistant IA',
};

/**
 * Minimal layout for embed widget.
 * No sidebar, no navigation - just the chat interface.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
