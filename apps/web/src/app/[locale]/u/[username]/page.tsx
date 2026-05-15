import type { Metadata } from 'next';
import ProfilePage from './profile-page';
import { DEFAULT_OG_IMAGE, canonicalUrl, fetchPublicJSON } from '@/lib/seo';

interface Props {
  params: Promise<{ locale: string; username: string }>;
}

interface CreatorProfile {
  name: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params;
  const creator = await fetchPublicJSON<CreatorProfile>(`/explore/creators/${username}`, 120);

  if (!creator) {
    return {
      title: `@${username} — CorpusAI`,
      robots: { index: false, follow: false },
    };
  }

  const displayName = creator.name || creator.username || username;
  const title = `${displayName} — CorpusAI`;
  const description =
    creator.bio ||
    (locale === 'en'
      ? `Discover AI assistants created by ${displayName} on CorpusAI.`
      : `Découvrez les assistants IA créés par ${displayName} sur CorpusAI.`);
  const url = canonicalUrl(`/u/${username}`, locale);

  const images = creator.image
    ? [{ url: creator.image, alt: displayName }]
    : [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: displayName }];

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'profile',
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

export default async function Page({ params }: Props) {
  const { username } = await params;
  return <ProfilePage username={username} />;
}
