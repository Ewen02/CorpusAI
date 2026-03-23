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

  const scriptCode = `<script\n  src="${origin}/widget.js"\n  data-ai="${ai.slug}"${theme !== 'system' ? `\n  data-theme="${theme}"` : ''}${color !== '#3b82f6' ? `\n  data-color="${color}"` : ''}${height !== '600' ? `\n  data-height="${height}"` : ''}\n></script>`;

  const isReady = ai.isPublic && ai.status === 'ACTIVE';

  return (
    <div className="space-y-6">
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
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {ai.status !== 'ACTIVE'
              ? 'Ton AI doit être en statut ACTIF pour être partageable.'
              : "Rends ton AI public dans les paramètres pour qu'il soit accessible."}
          </p>
          <a
            href={`/ais/${ai.id}/settings`}
            className="ml-auto text-xs text-primary underline hover:text-primary/80"
          >
            Paramètres →
          </a>
        </div>
      )}

      {/* Section 1: Direct link */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
              1
            </div>
            <div>
              <CardTitle className="text-base">Lien direct</CardTitle>
              <CardDescription className="text-xs">
                Partagez par email, réseaux sociaux ou messagerie
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={chatUrl} readOnly className="font-mono text-sm" />
            <CopyButton value={chatUrl} label="Copier" />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Embed iframe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
              2
            </div>
            <div>
              <CardTitle className="text-base">Intégrer sur ton site (iframe)</CardTitle>
              <CardDescription className="text-xs">
                Ajoute l'assistant directement dans une page web
              </CardDescription>
            </div>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Recommandé
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Customization controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Thème</Label>
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
              <Label className="text-xs text-muted-foreground">Hauteur (px)</Label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-8 text-xs"
                min={300}
                max={1200}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Afficher l'en-tête</Label>
                <Switch checked={!hideHeader} onCheckedChange={(v) => setHideHeader(!v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Afficher le pied</Label>
                <Switch checked={!hideFooter} onCheckedChange={(v) => setHideFooter(!v)} />
              </div>
            </div>
          </div>

          {/* Generated code */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Code à coller</Label>
            <div className="relative">
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                {iframeCode}
              </pre>
              <div className="absolute right-2 top-2">
                <CopyButton value={iframeCode} />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Aperçu</Label>
            <div
              className="overflow-hidden rounded-lg border border-border/60"
              style={{ height: '280px' }}
            >
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 'none' }}
                title={`Aperçu ${ai.name}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Script tag */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
              3
            </div>
            <div>
              <CardTitle className="text-base">Script tag</CardTitle>
              <CardDescription className="text-xs">
                Intégration automatique sans iframe
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium">
                1
              </span>
              <span>
                Colle ce code avant la fermeture de la balise{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">&lt;/body&gt;</code>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium">
                2
              </span>
              <span>Le widget apparaîtra automatiquement en bas à droite</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/60 text-[10px] font-medium">
                3
              </span>
              <span>
                Personnalise avec les attributs{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">data-theme</code>,{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">data-color</code>
              </span>
            </li>
          </ol>

          <div className="relative">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-xs leading-relaxed">
              {scriptCode}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton value={scriptCode} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
