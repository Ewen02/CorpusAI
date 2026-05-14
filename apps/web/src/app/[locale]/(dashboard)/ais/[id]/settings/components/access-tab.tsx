'use client';

import * as React from 'react';

import { useAccessControl } from '../hooks';
import { AccessCodeSection } from './access-code-section';
import { AccessMembersSection } from './access-members-section';
import { AccessModeSelector } from './access-mode-selector';
import { AccessTokenSection } from './access-token-section';

interface AccessTabProps {
  aiId: string;
  inviteOnly: boolean;
  hasAccessToken: boolean;
  hasAccessCode: boolean;
}

export function AccessTab({ aiId, inviteOnly, hasAccessToken, hasAccessCode }: AccessTabProps) {
  const access = useAccessControl({ aiId, inviteOnly, hasAccessToken, hasAccessCode });

  return (
    <div className="space-y-6">
      <AccessModeSelector
        accessMode={access.accessMode}
        isPending={access.isModePending}
        onModeChange={access.handleModeChange}
      />

      {access.accessMode === 'token' && (
        <AccessTokenSection
          hasAccessToken={hasAccessToken}
          generatedToken={access.generatedToken}
          copied={access.copied}
          isGenerating={access.isTokenPending}
          isDeleting={access.isTokenDeletePending}
          onGenerate={access.handleGenerateToken}
          onDelete={access.handleDeleteToken}
          onCopy={access.handleCopyUrl}
        />
      )}

      {access.accessMode === 'code' && (
        <AccessCodeSection
          hasAccessCode={hasAccessCode}
          accessCode={access.accessCode}
          setAccessCode={access.setAccessCode}
          savedCodeValue={access.savedCodeValue}
          codeSaved={access.codeSaved}
          isSaving={access.isCodePending}
          isDeleting={access.isCodeDeletePending}
          onSave={access.handleSaveCode}
          onDelete={access.handleDeleteCode}
        />
      )}

      {access.accessMode === 'invite' && (
        <AccessMembersSection
          members={access.members}
          isLoading={access.isLoadingMembers}
          inviteEmail={access.inviteEmail}
          setInviteEmail={access.setInviteEmail}
          inviteError={access.inviteError}
          isInviting={access.isInvitePending}
          isRevoking={access.isRevokePending}
          onInvite={access.handleInvite}
          onRevoke={access.handleRevoke}
        />
      )}
    </div>
  );
}
