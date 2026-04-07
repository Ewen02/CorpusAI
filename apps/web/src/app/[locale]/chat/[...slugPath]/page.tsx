import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChatPage from './chat-page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ChatPageProps {
  params: Promise<{ slugPath: string[] }>;
}

function parseSlugPath(slugPath: string[]): { username: string; slug: string } | null {
  const rawUsername = slugPath[0];
  const slug = slugPath[1];
  if (!rawUsername || !slug || !rawUsername.startsWith('@')) return null;
  return { username: rawUsername.slice(1), slug };
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

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const { slugPath } = await params;
  const parsed = parseSlugPath(slugPath);

  if (!parsed) {
    return { title: 'Assistant — CorpusAI' };
  }

  const ai = await fetchAIInfo(parsed.username, parsed.slug);

  if (!ai) {
    return { title: 'Assistant — CorpusAI' };
  }

  return {
    title: `${ai.name} — CorpusAI`,
    description: ai.description || `Discutez avec ${ai.name}, propulse par CorpusAI`,
    openGraph: {
      title: `${ai.name} — CorpusAI`,
      description: ai.description || `Discutez avec ${ai.name}, propulse par CorpusAI`,
      type: 'website',
      siteName: 'CorpusAI',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${ai.name} — CorpusAI`,
      description: ai.description || `Discutez avec ${ai.name}, propulse par CorpusAI`,
    },
  };
}

export default async function Page({ params }: ChatPageProps) {
  const { slugPath } = await params;
  const parsed = parseSlugPath(slugPath);

  if (!parsed) {
    notFound();
  }

  return <ChatPage username={parsed.username} slug={parsed.slug} />;
}
