import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import EmbedWidget from './embed-widget';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface EmbedPageProps {
  params: Promise<{ slug: string }>;
}

async function fetchAIInfo(slug: string) {
  try {
    const res = await fetch(`${API_URL}/chat/${slug}/info`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ name: string; description?: string; logo?: string }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: EmbedPageProps): Promise<Metadata> {
  const { slug } = await params;
  const ai = await fetchAIInfo(slug);

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
