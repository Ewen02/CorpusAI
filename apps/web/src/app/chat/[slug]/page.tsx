import type { Metadata } from 'next';
import ChatPage from './chat-page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ChatPageProps {
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

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const { slug } = await params;
  const ai = await fetchAIInfo(slug);

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

export default function Page() {
  return <ChatPage />;
}
