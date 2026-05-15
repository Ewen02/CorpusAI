'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import { useInviteCollaborator, type CollaboratorRole } from '@/lib/queries';
import { ApiError } from '@/lib/api-client';

interface InviteCollaboratorModalProps {
  aiId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteCollaboratorModal({
  aiId,
  open,
  onOpenChange,
}: InviteCollaboratorModalProps) {
  const t = useTranslations('ai.team');
  const invite = useInviteCollaborator(aiId);

  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<CollaboratorRole>('EDITOR');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setEmail('');
      setRole('EDITOR');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await invite.mutateAsync({ email, role });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError(t('errorAlreadyInvited'));
          return;
        }
        if (err.status === 400 && err.message.toLowerCase().includes('yourself')) {
          setError(t('errorSelfInvite'));
          return;
        }
      }
      setError(t('errorInvite'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" closeLabel={t('cancel')}>
        <DialogHeader>
          <DialogTitle>{t('inviteTitle')}</DialogTitle>
          <DialogDescription>{t('inviteDescription')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-describedby={error ? 'invite-form-error' : undefined}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-tx-secondary">
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px]"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'invite-form-error' : undefined}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium text-tx-secondary">{t('role')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as CollaboratorRole)}>
              <SelectTrigger className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EDITOR">
                  <div>
                    <p className="text-[13px] font-medium">{t('roleEditor')}</p>
                    <p className="text-[11px] text-tx-muted">{t('roleEditorHint')}</p>
                  </div>
                </SelectItem>
                <SelectItem value="VIEWER">
                  <div>
                    <p className="text-[13px] font-medium">{t('roleViewer')}</p>
                    <p className="text-[11px] text-tx-muted">{t('roleViewerHint')}</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p
              id="invite-form-error"
              role="alert"
              className="text-[12px] text-[hsl(var(--danger))]"
            >
              {error}
            </p>
          )}

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={invite.isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={invite.isPending || !email}>
              {invite.isPending ? t('submitting') : t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
