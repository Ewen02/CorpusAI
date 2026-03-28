'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';

const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'FR',
  en: 'EN',
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-0.5">
      {Object.entries(LOCALE_LABELS).map(([key, label]) => (
        <button
          key={key}
          onClick={() => switchLocale(key as Locale)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
            locale === key
              ? 'bg-[hsl(var(--accent-500)/0.15)] text-[hsl(var(--accent-500))]'
              : 'text-tx-muted hover:text-tx-primary'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
