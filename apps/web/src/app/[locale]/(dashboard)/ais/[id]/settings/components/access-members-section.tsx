'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Input, cn } from '@corpusai/ui';
import type { AIAccessGrant } from '@/lib/queries';

import { CARD_CLASS, INPUT_CLASS } from '../constants';

interface AccessMembersSectionProps {
  members: AIAccessGrant[] | undefined;
  isLoading: boolean;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteError: string;
  isInviting: boolean;
  isRevoking: boolean;
  onInvite: (e: React.FormEvent) => void;
  onRevoke: (endUserId: string) => void;
}

export function AccessMembersSection({
  members,
  isLoading,
  inviteEmail,
  setInviteEmail,
  inviteError,
  isInviting,
  isRevoking,
  onInvite,
  onRevoke,
}: AccessMembersSectionProps) {
  const t = useTranslations('aiSettings.accessTab');

  return (
    <div className={CARD_CLASS}>
      <div className="mb-4">
        <p className="text-[15px] font-semibold text-tx-primary">{t('invitedMembers')}</p>
        <p className="mt-0.5 text-[13px] text-tx-muted">{t('invitedMembersDescription')}</p>
      </div>

      <form onSubmit={onInvite} className="mb-5 flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <label
            htmlFor="access-members-invite-email"
            className="text-[13px] font-medium text-tx-secondary"
          >
            {t('emailLabel')}
          </label>
          <Input
            id="access-members-invite-email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            required
            className={INPUT_CLASS}
            aria-invalid={inviteError ? 'true' : undefined}
            aria-describedby={inviteError ? 'access-members-invite-error' : undefined}
          />
        </div>
        <Button type="submit" size="sm" disabled={isInviting}>
          {isInviting ? t('inviting') : t('invite')}
        </Button>
      </form>
      {inviteError && (
        <p
          id="access-members-invite-error"
          role="alert"
          className="mb-3 text-[12px] text-[hsl(var(--danger))]"
        >
          {inviteError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-[hsl(var(--surface-2))]" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <p className="text-[13px] text-tx-muted">{t('noMembers')}</p>
      ) : (
        <div className="space-y-2">
          {members.map((grant) => (
            <MemberRow key={grant.id} grant={grant} isRevoking={isRevoking} onRevoke={onRevoke} />
          ))}
        </div>
      )}
    </div>
  );
}

interface MemberRowProps {
  grant: AIAccessGrant;
  isRevoking: boolean;
  onRevoke: (endUserId: string) => void;
}

function MemberRow({ grant, isRevoking, onRevoke }: MemberRowProps) {
  const t = useTranslations('aiSettings.accessTab');

  return (
    <div className="flex items-center justify-between rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-3 py-2">
      <div>
        <p className="text-[13px] font-medium text-tx-primary">{grant.endUser.email}</p>
        {grant.endUser.name && <p className="text-[12px] text-tx-muted">{grant.endUser.name}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={cn(
            'text-[11px]',
            grant.endUser.emailVerified
              ? 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]'
              : 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]'
          )}
        >
          {grant.endUser.emailVerified ? t('memberActive') : t('memberPending')}
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[12px] text-tx-muted hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))]"
          onClick={() => onRevoke(grant.endUser.id)}
          disabled={isRevoking}
        >
          {t('revoke')}
        </Button>
      </div>
    </div>
  );
}
