'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Lock, ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  CopyButton,
  Badge,
  AnalyticsCard,
} from '@corpusai/ui';
import type { AI } from '@corpusai/types';

interface IntegrationTabProps {
  ai: AI;
}

export function IntegrationTab({ ai }: IntegrationTabProps) {
  const t = useTranslations('integration');
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://corpusai.io';

  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('system');
  const [height, setHeight] = React.useState('600');
  const [hideHeader, setHideHeader] = React.useState(false);
  const [hideFooter, setHideFooter] = React.useState(false);
  const [color, setColor] = React.useState(ai.primaryColor || '#3b82f6');

  const chatUrl = `${origin}/chat/${ai.slug}`;

  const embedParams = new URLSearchParams();
  if (theme !== 'system') embedParams.set('theme', theme);
  if (hideHeader) embedParams.set('hideHeader', '1');
  if (hideFooter) embedParams.set('hideFooter', '1');
  if (color && color !== '#3b82f6') embedParams.set('color', encodeURIComponent(color));
  const embedQuery = embedParams.toString();
  const embedUrl = `${origin}/embed/${ai.slug}${embedQuery ? `?${embedQuery}` : ''}`;

  const iframeCode = `<iframe\n  src="${embedUrl}"\n  width="100%"\n  height="${height}"\n  frameborder="0"\n  allow="clipboard-write"\n  style="border: none; border-radius: 12px;"\n></iframe>`;

  const isReady = ai.isPublic && ai.status === 'ACTIVE';

  return (
    <div className="space-y-5">
      {/* Status banner */}
      {isReady ? (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <p className="text-sm font-medium text-green-500">{t('aiPublicAccessible')}</p>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-green-500/70 underline hover:text-green-500"
          >
            {t('viewPage')}
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('sharingLocked')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ai.status !== 'ACTIVE' ? t('mustBeActive') : t('makePublicToUnlock')}
          </p>
          <a
            href={`/ais/${ai.id}/settings`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('goToSettings')}
          </a>
        </div>
      )}

      {isReady && (
        <>
          {/* Section 1: Direct link */}
          <AnalyticsCard>
            <SectionHeader
              number={1}
              title={t('directLink')}
              description={t('directLinkDescription')}
            />
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--surface-0))] p-1 pl-3">
                <span className="flex-1 truncate font-mono text-sm text-tx-secondary">
                  {chatUrl}
                </span>
                <CopyButton value={chatUrl} label={t('copy')} />
              </div>
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--accent-400))] transition-colors hover:text-[hsl(var(--accent-500))]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('openNewTab')}
              </a>
            </div>
          </AnalyticsCard>

          {/* Section 2: Embed iframe */}
          <AnalyticsCard>
            <SectionHeader
              number={2}
              title={t('embedOnSite')}
              description={t('embedOnSiteDescription')}
              badge={t('recommended')}
            />

            {/* Controls + Preview side by side */}
            <div className="grid grid-cols-5 gap-4">
              {/* Controls */}
              <div className="col-span-2 min-w-0 space-y-4 self-start rounded-lg bg-[hsl(var(--surface-0))] p-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tx-muted">{t('theme')}</Label>
                    <Select
                      value={theme}
                      onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">{t('themeSystem')}</SelectItem>
                        <SelectItem value="light">{t('themeLight')}</SelectItem>
                        <SelectItem value="dark">{t('themeDark')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-tx-muted">{t('height')}</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      min={300}
                      max={1200}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-tx-muted">{t('primaryColor')}</Label>
                    <div className="flex items-center gap-2">
                      <label className="shrink-0 cursor-pointer">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className="h-7 w-7 rounded-full border-2 border-white/20 shadow-sm transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                        />
                      </label>
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-8 font-mono text-xs"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 border-t border-[hsl(var(--border-subtle))] pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-tx-muted">{t('header')}</Label>
                    <Switch checked={!hideHeader} onCheckedChange={(v) => setHideHeader(!v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-tx-muted">{t('branding')}</Label>
                    <Switch checked={!hideFooter} onCheckedChange={(v) => setHideFooter(!v)} />
                  </div>
                </div>
              </div>

              {/* Live preview — browser mock */}
              <div className="col-span-3 overflow-hidden rounded-lg border border-[hsl(var(--border-default))] shadow-[var(--shadow-md)]">
                {/* Chrome bar */}
                <div className="flex h-9 items-center gap-3 bg-[hsl(var(--surface-3))] px-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 overflow-hidden rounded bg-[hsl(var(--surface-2))] px-2 py-1 text-center">
                    <span className="block truncate text-[11px] text-tx-muted">
                      {embedUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>
                {/* iframe */}
                <iframe
                  src={embedUrl}
                  width="100%"
                  frameBorder="0"
                  style={{ height: '480px', border: 'none', display: 'block' }}
                  title={`Aperçu ${ai.name}`}
                />
              </div>
            </div>

            {/* Generated code — full width below */}
            <div className="mt-4 space-y-2">
              <Label className="text-xs text-tx-muted">{t('codeToPaste')}</Label>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[hsl(var(--surface-0))] p-4 font-mono text-xs leading-relaxed text-tx-secondary">
                  {iframeCode}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton value={iframeCode} />
                </div>
              </div>
              {/* Contextual note based on access mode */}
              {ai.inviteOnly ? (
                <p className="rounded-md border border-[hsl(var(--warning)/0.2)] bg-[hsl(var(--warning)/0.05)] px-3 py-2 text-[12px] text-[hsl(var(--warning))]">
                  {t('inviteOnlyNote')}
                </p>
              ) : (
                <p className="rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-0))] px-3 py-2 text-[12px] text-tx-muted">
                  {t('accessCodeNote')}{' '}
                  <code className="rounded bg-[hsl(var(--surface-2))] px-1 font-mono">
                    ?code=YOUR_CODE
                  </code>{' '}
                  {t('or')}{' '}
                  <code className="rounded bg-[hsl(var(--surface-2))] px-1 font-mono">
                    ?t=YOUR_TOKEN
                  </code>{' '}
                  {t('toIframeUrl')}
                </p>
              )}
            </div>
          </AnalyticsCard>

          {/* Section 3: Widget flottant (coming soon) */}
          <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))] p-6 opacity-60">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                3
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-tx-primary">{t('floatingWidget')}</p>
                <p className="text-[12px] text-tx-muted">{t('floatingWidgetDescription')}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                {t('comingSoon')}
              </Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t('floatingWidgetComingSoonNote')}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Local sub-component (specific to this tab)
// ============================================

function SectionHeader({
  number,
  title,
  description,
  badge,
}: {
  number: number;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--accent-500)/0.15)] text-xs font-bold text-[hsl(var(--accent-400))]">
        {number}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-tx-primary">{title}</p>
        <p className="text-[12px] text-tx-muted">{description}</p>
      </div>
      {badge && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {badge}
        </Badge>
      )}
    </div>
  );
}
