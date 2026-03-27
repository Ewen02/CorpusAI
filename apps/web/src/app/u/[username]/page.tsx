import type { Metadata } from 'next';
import ProfilePage from './profile-page';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Props {
  params: Promise<{ username: string }>;
}

async function fetchCreator(username: string) {
  try {
    const res = await fetch(`${API_URL}/explore/creators/${username}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ name: string | null; bio: string | null; image: string | null }>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const creator = await fetchCreator(username);

  if (!creator) {
    return { title: `@${username} — CorpusAI` };
  }

  return {
    title: `${creator.name || username} — CorpusAI`,
    description:
      creator.bio ||
      `Découvrez les assistants IA créés par ${creator.name || username} sur CorpusAI.`,
    openGraph: {
      title: `${creator.name || username} — CorpusAI`,
      description: creator.bio || `Assistants IA de ${creator.name || username}`,
      images: creator.image ? [{ url: creator.image }] : [],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${creator.name || username} — CorpusAI`,
      description:
        creator.bio || `Découvrez les assistants IA de ${creator.name || username} sur CorpusAI.`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <ProfilePage username={username} />;
}
