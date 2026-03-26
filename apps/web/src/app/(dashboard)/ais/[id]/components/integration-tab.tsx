'use client';

import * as React from 'react';
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
} from '@corpusai/ui';
import type { AI } from '@corpusai/types';

interface IntegrationTabProps {
  ai: AI;
}

// Shared shell classes — same visual pattern as stat cards
const SECTION_SHELL =
  'relative overflow-hidden rounded-xl border border-[hsl(var(--accent-500)/0.2)] bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)] p-6 shadow-[var(--shadow-accent-sm)]';

function SectionGlow() {
  return (
    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.08),transparent_70%)]" />
  );
}

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
    <div className="relative mb-5 flex items-center gap-3">
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

export function IntegrationTab({ ai }: IntegrationTabProps) {
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
          <p className="text-sm font-medium text-green-500">Ton AI est public et accessible</p>
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-green-500/70 underline hover:text-green-500"
          >
            Voir la page →
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <LockIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Options de partage verrouillées</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ai.status !== 'ACTIVE'
              ? 'Ton AI doit être en statut Actif pour être partageable.'
              : "Rends ton AI public dans les paramètres pour débloquer le partage et l'intégration."}
          </p>
          <a
            href={`/ais/${ai.id}/settings`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Aller aux paramètres →
          </a>
        </div>
      )}

      {isReady && (
        <>
          {/* Section 1: Direct link */}
          <div className={SECTION_SHELL}>
            <SectionGlow />
            <SectionHeader
              number={1}
              title="Lien direct"
              description="Partager un lien direct vers l'assistant"
            />
            <div className="relative space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--surface-0))] p-1 pl-3">
                <span className="flex-1 truncate font-mono text-sm text-tx-secondary">
                  {chatUrl}
                </span>
                <CopyButton value={chatUrl} label="Copier" />
              </div>
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--accent-400))] transition-colors hover:text-[hsl(var(--accent-500))]"
              >
                <ExternalLinkIcon className="h-3.5 w-3.5" />
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          </div>

          {/* Section 2: Embed iframe */}
          <div className={SECTION_SHELL}>
            <SectionGlow />
            <SectionHeader
              number={2}
              title="Intégrer sur ton site"
              description="Idéal pour une page dédiée ou une section de votre site"
              badge="Recommandé"
            />

            {/* Controls + Preview side by side */}
            <div className="relative grid grid-cols-5 gap-4">
              {/* Controls */}
              <div className="col-span-2 min-w-0 space-y-4 self-start rounded-lg bg-[hsl(var(--surface-0))] p-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-tx-muted">Thème</Label>
                    <Select
                      value={theme}
                      onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">Système</SelectItem>
                        <SelectItem value="light">Clair</SelectItem>
                        <SelectItem value="dark">Sombre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-tx-muted">Hauteur (px)</Label>
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
                    <Label className="text-xs text-tx-muted">Couleur principale</Label>
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
                    <Label className="text-xs text-tx-muted">En-tête</Label>
                    <Switch checked={!hideHeader} onCheckedChange={(v) => setHideHeader(!v)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-tx-muted">Branding CorpusAI</Label>
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
            <div className="relative mt-4 space-y-2">
              <Label className="text-xs text-tx-muted">Code à coller</Label>
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
                  Cet assistant nécessite une connexion. Partagez le lien directement avec vos
                  membres invités — l&apos;iframe seule ne fonctionnera pas pour les utilisateurs
                  non connectés.
                </p>
              ) : (
                <p className="rounded-md border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-0))] px-3 py-2 text-[12px] text-tx-muted">
                  Pour les modes avec code d&apos;accès ou lien secret, ajoutez{' '}
                  <code className="rounded bg-[hsl(var(--surface-2))] px-1 font-mono">
                    ?code=VOTRE_CODE
                  </code>{' '}
                  ou{' '}
                  <code className="rounded bg-[hsl(var(--surface-2))] px-1 font-mono">
                    ?t=VOTRE_TOKEN
                  </code>{' '}
                  à l&apos;URL de l&apos;iframe.
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Widget flottant (coming soon) */}
          <div className="relative overflow-hidden rounded-xl border border-[hsl(var(--border-subtle))] bg-[hsl(var(--surface-1))] p-6 opacity-60">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                3
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-tx-primary">Widget flottant</p>
                <p className="text-[12px] text-tx-muted">
                  Un bouton flottant sur votre site qui ouvre l'assistant au clic
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px]">
                Bientôt
              </Badge>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Cette option permettra d'ajouter automatiquement un bouton flottant sur votre site
              sans iframe. Elle est en cours de développement.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
