import type { Metadata } from 'next';
import ExplorePage from './explore-page';

export const metadata: Metadata = {
  title: 'Explorer les AIs — CorpusAI',
  description:
    'Découvrez des assistants IA créés par la communauté CorpusAI. Support, éducation, juridique et plus encore.',
  openGraph: {
    title: 'Explorer les AIs — CorpusAI',
    description: 'Découvrez des assistants IA créés par la communauté.',
    type: 'website',
  },
};

export default function Page() {
  return <ExplorePage />;
}
