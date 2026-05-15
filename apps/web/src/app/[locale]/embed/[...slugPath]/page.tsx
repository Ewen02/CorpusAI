import type { Metadata } from 'next';
import EmbedWidget from './embed-widget';
import { fetchPublicJSON } from '@/lib/seo';

interface EmbedPageProps {
  params: Promise<{ slugPath: string[] }>;
}

interface PublicAIInfo {
  name: string;
  description?: string | null;
  avatar?: string | null;
}

function parseSlugPath(slugPath: string[]): { username: string; slug: string } | null {
  const rawUsername = slugPath[0];
  const slug = slugPath[1];
  if (!rawUsername || !slug) return null;
  // Tolerate both URL-encoded and decoded segments, with or without '@' prefix.
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawUsername);
  } catch {
    decoded = rawUsername;
  }
  const username = decoded.startsWith('@') ? decoded.slice(1) : decoded;
  if (!username) return null;
  return { username, slug };
}

// Embed routes are noindex via the embed layout (see ../layout.tsx).
// We still set a useful <title> so the iframe host can read it programmatically.
export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slugPath } = await params;
  const parsed = parseSlugPath(slugPath);

  if (!parsed) {
    return { title: 'CorpusAI Widget', robots: { index: false, follow: false } };
  }

  const ai = await fetchPublicJSON<PublicAIInfo>(`/chat/${parsed.username}/${parsed.slug}/info`);

  if (!ai) {
    return { title: 'CorpusAI Widget', robots: { index: false, follow: false } };
  }

  return {
    title: `${ai.name} — CorpusAI`,
    description: ai.description || `Chat with ${ai.name}, powered by CorpusAI`,
    robots: { index: false, follow: false },
  };
}

export default function EmbedPage() {
  return <EmbedWidget />;
}
