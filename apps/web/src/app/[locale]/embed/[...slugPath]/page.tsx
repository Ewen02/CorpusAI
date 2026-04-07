import type { Metadata } from 'next';
import EmbedWidget from './embed-widget';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EmbedPageProps {
  params: Promise<{ slugPath: string[] }>;
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

async function fetchAIInfo(username: string, slug: string) {
  try {
    const res = await fetch(`${API_URL}/chat/${username}/${slug}/info`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ name: string; description?: string; logo?: string }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slugPath } = await params;
  const parsed = parseSlugPath(slugPath);

  if (!parsed) {
    return { title: 'CorpusAI Widget' };
  }

  const ai = await fetchAIInfo(parsed.username, parsed.slug);

  if (!ai) {
    return { title: 'CorpusAI Widget' };
  }

  return {
    title: `${ai.name} — CorpusAI`,
    description: ai.description || `Chat with ${ai.name}, powered by CorpusAI`,
    openGraph: {
      title: `${ai.name} — CorpusAI`,
      description: ai.description || `Chat with ${ai.name}, powered by CorpusAI`,
      type: 'website',
    },
  };
}

export default function EmbedPage() {
  return <EmbedWidget />;
}
