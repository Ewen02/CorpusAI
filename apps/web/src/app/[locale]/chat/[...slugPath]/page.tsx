import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChatPage from './chat-page';
import { DEFAULT_OG_IMAGE, canonicalUrl, fetchPublicJSON } from '@/lib/seo';

interface ChatPageProps {
  params: Promise<{ locale: string; slugPath: string[] }>;
}

interface PublicAIInfo {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  welcomeMessage?: string | null;
  primaryColor?: string | null;
  avatar?: string | null;
}

function parseSlugPath(slugPath: string[]): { username: string; slug: string } | null {
  const rawUsername = slugPath[0];
  const slug = slugPath[1];
  if (!rawUsername || !slug) return null;
  // Next.js may or may not URL-decode catch-all segments depending on runtime,
  // so handle both '@user' and '%40user'. Also tolerate a missing '@' prefix.
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

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const { locale, slugPath } = await params;
  const parsed = parseSlugPath(slugPath);

  if (!parsed) {
    return {
      title: 'Assistant — CorpusAI',
      robots: { index: false, follow: false },
    };
  }

  const ai = await fetchPublicJSON<PublicAIInfo>(`/chat/${parsed.username}/${parsed.slug}/info`);

  if (!ai) {
    return {
      title: 'Assistant — CorpusAI',
      robots: { index: false, follow: false },
    };
  }

  const title = `${ai.name} — CorpusAI`;
  const description =
    ai.description || `Chat with ${ai.name}, an AI assistant powered by CorpusAI.`;
  const url = canonicalUrl(`/chat/@${parsed.username}/${parsed.slug}`, locale);

  // Prefer the AI logo as social image; fall back to a static default that we
  // reference but do not generate here. The dynamic OG image route
  // (opengraph-image.tsx) will be used by Next when no `images` is specified,
  // but we set it explicitly so Twitter/LinkedIn pick up the logo when present.
  const images = ai.avatar
    ? [{ url: ai.avatar, alt: ai.name }]
    : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: ai.name }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'CorpusAI',
      url,
      images,
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: images.map((i) => i.url),
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
