'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../atoms/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../atoms/tabs';
import { Input } from '../atoms/input';
import { Label } from '../atoms/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../atoms/select';
import { Switch } from '../atoms/switch';
import { CopyButton } from '../atoms/copy-button';
import { cn } from '../lib/utils';

export interface ShareModalAI {
  slug: string;
  name: string;
  primaryColor?: string;
}

export interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ai: ShareModalAI;
  baseUrl?: string;
}

export function ShareModal({ open, onOpenChange, ai, baseUrl }: ShareModalProps) {
  const origin =
    baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://corpusai.io');

  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('system');
  const [height, setHeight] = React.useState('600');
  const [hideHeader, setHideHeader] = React.useState(false);
  const [hideFooter, setHideFooter] = React.useState(false);
  const [color, setColor] = React.useState(ai.primaryColor || '#3b82f6');

  // URLs
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager &laquo; {ai.name} &raquo;</DialogTitle>
          <DialogDescription>
            Partagez votre assistant par lien direct, embed ou script.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="link" className="flex-1">
              Lien
            </TabsTrigger>
            <TabsTrigger value="embed" className="flex-1">
              Embed
            </TabsTrigger>
            <TabsTrigger value="script" className="flex-1">
              Script
            </TabsTrigger>
          </TabsList>

          {/* Tab: Direct link */}
          <TabsContent value="link" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Lien direct</Label>
              <div className="flex items-center gap-2">
                <Input value={chatUrl} readOnly className="font-mono text-sm" />
                <CopyButton value={chatUrl} label="Copier" />
              </div>
              <p className="text-xs text-muted-foreground">
                Partagez ce lien par email, reseaux sociaux ou messagerie.
              </p>
            </div>
          </TabsContent>

          {/* Tab: Embed iframe */}
          <TabsContent value="embed" className="mt-4 space-y-4">
            <CustomizationControls
              theme={theme}
              onThemeChange={setTheme}
              height={height}
              onHeightChange={setHeight}
              hideHeader={hideHeader}
              onHideHeaderChange={setHideHeader}
              hideFooter={hideFooter}
              onHideFooterChange={setHideFooter}
              color={color}
              onColorChange={setColor}
            />

            <div className="space-y-2">
              <Label>Code HTML</Label>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 font-mono text-xs">
                  {iframeCode}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton value={iframeCode} />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label>Apercu</Label>
              <div
                className="overflow-hidden rounded-lg border border-border"
                style={{ height: '300px' }}
              >
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 'none' }}
                  title={`Apercu ${ai.name}`}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Script */}
          <TabsContent value="script" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Script embed</Label>
              <div className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 font-mono text-xs">
                  {scriptCode}
                </pre>
                <div className="absolute right-2 top-2">
                  <CopyButton value={scriptCode} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Collez ce script n&apos;importe ou dans votre site. Il creera automatiquement le
                widget.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Sub-components
// ============================================

interface CustomizationControlsProps {
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (v: 'light' | 'dark' | 'system') => void;
  height: string;
  onHeightChange: (v: string) => void;
  hideHeader: boolean;
  onHideHeaderChange: (v: boolean) => void;
  hideFooter: boolean;
  onHideFooterChange: (v: boolean) => void;
  color: string;
  onColorChange: (v: string) => void;
}

function CustomizationControls({
  theme,
  onThemeChange,
  height,
  onHeightChange,
  hideHeader,
  onHideHeaderChange,
  hideFooter,
  onHideFooterChange,
  color,
  onColorChange,
}: CustomizationControlsProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Personnalisation</Label>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Theme</Label>
          <Select
            value={theme}
            onValueChange={(v) => onThemeChange(v as 'light' | 'dark' | 'system')}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">Systeme</SelectItem>
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
            onChange={(e) => onHeightChange(e.target.value)}
            className="h-8 text-xs"
            min={300}
            max={1200}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Couleur</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="h-8 font-mono text-xs"
              maxLength={7}
            />
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Header</Label>
            <Switch checked={!hideHeader} onCheckedChange={(v) => onHideHeaderChange(!v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Footer</Label>
            <Switch checked={!hideFooter} onCheckedChange={(v) => onHideFooterChange(!v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
