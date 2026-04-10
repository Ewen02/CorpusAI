import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@corpusai/ui';
import { Link } from '@/i18n/routing';
import { ApiDocsContent } from './api-docs-content';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'API Documentation — CorpusAI',
    description:
      'Complete API reference for CorpusAI. Authenticate with API keys, query your AI assistants, and integrate with the TypeScript SDK.',
    openGraph: {
      title: 'API Documentation — CorpusAI',
      description: 'Complete API reference for CorpusAI.',
      url: 'https://corpusai.io/docs/api',
      siteName: 'CorpusAI',
      type: 'website',
    },
  };
}

export default async function ApiDocsPage() {
  const t = await getTranslations('docs');

  return (
    <div className="bg-page min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-[hsl(var(--border))]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gradient text-lg font-bold">
              CorpusAI
            </Link>
            <Badge variant="secondary">{t('title')}</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/settings/api-keys"
              className="text-sm text-tx-muted transition-colors hover:text-tx-primary"
            >
              {t('getApiKey')}
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-tx-muted transition-colors hover:text-tx-primary"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[hsl(var(--border))]">
        <div className="orb-primary absolute -right-32 -top-32 h-64 w-64 opacity-30" />
        <div className="orb-cobalt absolute -left-16 top-8 h-48 w-48 opacity-20" />
        <div className="relative mx-auto max-w-6xl px-6 py-16">
          <h1 className="text-gradient mb-3 text-3xl font-bold">{t('heading')}</h1>
          <p className="max-w-2xl text-lg text-tx-muted">{t('description')}</p>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <ApiDocsContent />
      </main>
    </div>
  );
}
