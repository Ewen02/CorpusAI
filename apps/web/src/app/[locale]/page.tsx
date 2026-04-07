import type { Metadata } from 'next';
import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import { Button, Badge } from '@corpusai/ui';
import { AnimatedSection } from '@/components/animated-section';
import { AnalyticsTracker } from '@/components/analytics-tracker';

export const metadata: Metadata = {
  title: 'CorpusAI — Créez votre IA depuis vos documents',
  description:
    'Importez vos PDF, entraînez votre assistant IA et partagez-le avec la communauté. Créez une IA conversationnelle depuis votre base de connaissances en quelques minutes.',
  openGraph: {
    title: 'CorpusAI — Créez votre IA depuis vos documents',
    description:
      'Importez vos PDF, entraînez votre assistant IA et partagez-le avec la communauté.',
    url: 'https://corpusai.io',
    siteName: 'CorpusAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CorpusAI — Créez votre IA depuis vos documents',
    description: 'Importez vos PDF, entraînez votre assistant IA et partagez-le.',
  },
};

export const revalidate = 3600;

export default async function Home() {
  const t = await getTranslations('landing');

  const features = [
    {
      title: t('featureImport'),
      description: t('featureImportDesc'),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      ),
    },
    {
      title: t('featureChat'),
      description: t('featureChatDesc'),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
          />
        </svg>
      ),
    },
    {
      title: t('featureIntegrate'),
      description: t('featureIntegrateDesc'),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
          />
        </svg>
      ),
    },
    {
      title: t('featureShare'),
      description: t('featureShareDesc'),
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      ),
    },
  ];

  const showcaseAIs = [
    { name: t('showcaseLegal'), category: t('showcaseLegalCategory'), count: '2.4k' },
    { name: t('showcasePython'), category: t('showcasePythonCategory'), count: '1.8k' },
    { name: t('showcaseSupport'), category: t('showcaseSupportCategory'), count: '3.1k' },
    { name: t('showcaseTax'), category: t('showcaseTaxCategory'), count: '980' },
  ];

  return (
    <div className="min-h-screen">
      <AnalyticsTracker event="landing_viewed" />
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="text-base font-semibold tracking-tight">CorpusAI</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('features')}
            </a>
            <Link
              href="/explore"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('explore')}
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sign-in">{t('signIn')}</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/sign-up">{t('startFree')}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pb-24 pt-36 md:pb-32 md:pt-44">
        {/* Radial gradient background */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(230 65% 58% / 0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative mx-auto max-w-5xl px-6 text-center">
          <Badge variant="secondary" className="mb-6 text-xs">
            {t('badge')}
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-gradient">{t('heroTitle1')}</span>
            <br />
            {t('heroTitle2')}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            {t('heroDescription')}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="min-w-[200px]" asChild>
              <Link href="/sign-up">{t('ctaStart')}</Link>
            </Button>
            <Button variant="outline" size="lg" className="min-w-[160px]" asChild>
              <Link href="/explore">{t('ctaExplore')}</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/60">{t('noCreditCard')}</p>
        </div>

        {/* Hero visual */}
        <div className="relative mx-auto mt-16 max-w-2xl px-6">
          <div className="shadow-glass overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-border/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-border/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-border/80" />
              </div>
              <span className="ml-2 font-mono text-xs text-muted-foreground/60">index.html</span>
            </div>
            <div className="p-6 font-mono text-sm leading-relaxed">
              <p className="text-muted-foreground/50">&lt;!-- {t('codeComment')} --&gt;</p>
              <p className="mt-2">
                <span className="text-muted-foreground">&lt;</span>
                <span className="text-primary">script</span>
                <span className="text-muted-foreground"> src=</span>
                <span className="text-emerald-400">&quot;https://corpusai.io/widget.js&quot;</span>
              </p>
              <p className="pl-4">
                <span className="text-muted-foreground">data-ai=</span>
                <span className="text-emerald-400">&quot;{t('dataAiValue')}&quot;</span>
                <span className="text-muted-foreground"> /&gt;</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
              {t('features')}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('featuresTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              {t('featuresDescription')}
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 80}>
                <div className="group rounded-xl border border-border/60 bg-card p-6 transition-all duration-200 hover:border-primary/20 hover:bg-card/80">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-sm font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="border-t border-border/60 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground/50">
                {t('community')}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {t('communityTitle')}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t('communityDescription')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/explore">{t('exploreAIs')}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sign-up">{t('shareMyAI')}</Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {showcaseAIs.map((ai) => (
                <div
                  key={ai.name}
                  className="rounded-xl border border-border/60 bg-card p-4 transition-all duration-200 hover:border-primary/20"
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                    {ai.name.charAt(0)}
                  </div>
                  <p className="text-xs font-medium leading-snug">{ai.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {ai.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {ai.count} {t('convSuffix')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border/60 py-20 md:py-28">
        <AnimatedSection>
          <div className="shadow-glass relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/60 bg-card px-8 py-16 text-center">
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              aria-hidden
              style={{
                background:
                  'radial-gradient(ellipse 60% 60% at 50% 0%, hsl(230 65% 58% / 0.08) 0%, transparent 70%)',
              }}
            />
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('ctaTitle')}</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
              {t('ctaDescription')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/sign-up">{t('ctaStartFree')}</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/explore">{t('ctaExplorFirst')}</Link>
              </Button>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">C</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">CorpusAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/explore" className="transition-colors hover:text-foreground">
                {t('explore')}
              </Link>
              <a href="#" className="transition-colors hover:text-foreground">
                {t('privacy')}
              </a>
              <a href="#" className="transition-colors hover:text-foreground">
                {t('terms')}
              </a>
            </div>
            <p className="text-xs text-muted-foreground/50">
              © {new Date().getFullYear()} CorpusAI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
