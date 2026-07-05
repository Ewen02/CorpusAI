'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useCopyToClipboard } from '@/lib/hooks';
import {
  aiKeys,
  useAIMembers,
  useDeleteAccessCode,
  useDeleteAccessToken,
  useGenerateAccessToken,
  useInviteMember,
  useRevokeMember,
  useSetAccessCode,
  useSetAccessMode,
  type AIAccessGrant,
} from '@/lib/queries';

import type { AccessMode } from '../constants';

interface UseAccessControlInput {
  aiId: string;
  inviteOnly: boolean;
  hasAccessToken: boolean;
  hasAccessCode: boolean;
}

export interface UseAccessControlResult {
  // Mode
  accessMode: AccessMode;
  isModePending: boolean;
  handleModeChange: (mode: AccessMode) => Promise<void>;

  // Token
  generatedToken: { token: string; url: string } | null;
  copied: boolean;
  isTokenPending: boolean;
  isTokenDeletePending: boolean;
  handleGenerateToken: () => Promise<void>;
  handleDeleteToken: () => Promise<void>;
  handleCopyUrl: (url: string) => void;

  // Code
  accessCode: string;
  setAccessCode: (v: string) => void;
  savedCodeValue: string | null;
  codeSaved: boolean;
  isCodePending: boolean;
  isCodeDeletePending: boolean;
  handleSaveCode: () => Promise<void>;
  handleDeleteCode: () => Promise<void>;

  // Members
  members: AIAccessGrant[] | undefined;
  isLoadingMembers: boolean;
  inviteEmail: string;
  setInviteEmail: (v: string) => void;
  inviteError: string;
  isInvitePending: boolean;
  isRevokePending: boolean;
  handleInvite: (e: React.FormEvent) => Promise<void>;
  handleRevoke: (endUserId: string) => Promise<void>;
}

export function useAccessControl({
  aiId,
  inviteOnly,
  hasAccessToken,
  hasAccessCode,
}: UseAccessControlInput): UseAccessControlResult {
  const t = useTranslations('aiSettings.accessTab');
  const queryClient = useQueryClient();

  const { data: members, isLoading: isLoadingMembers } = useAIMembers(aiId);
  const generateToken = useGenerateAccessToken(aiId);
  const deleteToken = useDeleteAccessToken(aiId);
  const setCode = useSetAccessCode(aiId);
  const deleteCode = useDeleteAccessCode(aiId);
  const setModeMutation = useSetAccessMode(aiId);
  const inviteMember = useInviteMember(aiId);
  const revokeMember = useRevokeMember(aiId);

  const [accessMode, setAccessMode] = React.useState<AccessMode>('open');
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (!initialized.current) {
      if (inviteOnly) setAccessMode('invite');
      else if (hasAccessToken) setAccessMode('token');
      else if (hasAccessCode) setAccessMode('code');
      initialized.current = true;
    }
  }, [inviteOnly, hasAccessToken, hasAccessCode]);

  const [generatedToken, setGeneratedToken] = React.useState<{ token: string; url: string } | null>(
    null
  );
  const [accessCode, setAccessCode] = React.useState('');
  const [savedCodeValue, setSavedCodeValue] = React.useState<string | null>(null);
  const [codeSaved, setCodeSaved] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteError, setInviteError] = React.useState('');
  const { copied, copy } = useCopyToClipboard();
  const codeSavedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (codeSavedTimerRef.current) clearTimeout(codeSavedTimerRef.current);
    },
    []
  );

  const handleModeChange = async (mode: AccessMode) => {
    if (mode === accessMode || setModeMutation.isPending) return;
    const prev = accessMode;
    setAccessMode(mode);
    try {
      await setModeMutation.mutateAsync(mode);
      if (mode !== 'token') setGeneratedToken(null);
    } catch {
      setAccessMode(prev);
    }
  };

  const handleGenerateToken = async () => {
    const result = await generateToken.mutateAsync();
    setGeneratedToken(result);
  };

  const handleDeleteToken = async () => {
    await deleteToken.mutateAsync();
    setGeneratedToken(null);
    queryClient.invalidateQueries({ queryKey: aiKeys.detail(aiId) });
  };

  const handleCopyUrl = (url: string) => {
    copy(url);
  };

  const handleSaveCode = async () => {
    if (accessCode.length < 4) return;
    await setCode.mutateAsync(accessCode);
    setSavedCodeValue(accessCode);
    setCodeSaved(true);
    setAccessCode('');
    if (codeSavedTimerRef.current) clearTimeout(codeSavedTimerRef.current);
    codeSavedTimerRef.current = setTimeout(() => setCodeSaved(false), 2000);
  };

  const handleDeleteCode = async () => {
    await deleteCode.mutateAsync();
    setSavedCodeValue(null);
    setCodeSaved(false);
    queryClient.invalidateQueries({ queryKey: aiKeys.detail(aiId) });
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    try {
      await inviteMember.mutateAsync({ email: inviteEmail });
      setInviteEmail('');
    } catch {
      setInviteError(t('inviteError'));
    }
  };

  const handleRevoke = async (endUserId: string) => {
    await revokeMember.mutateAsync(endUserId);
  };

  return {
    accessMode,
    isModePending: setModeMutation.isPending,
    handleModeChange,
    generatedToken,
    copied,
    isTokenPending: generateToken.isPending,
    isTokenDeletePending: deleteToken.isPending,
    handleGenerateToken,
    handleDeleteToken,
    handleCopyUrl,
    accessCode,
    setAccessCode,
    savedCodeValue,
    codeSaved,
    isCodePending: setCode.isPending,
    isCodeDeletePending: deleteCode.isPending,
    handleSaveCode,
    handleDeleteCode,
    members,
    isLoadingMembers,
    inviteEmail,
    setInviteEmail,
    inviteError,
    isInvitePending: inviteMember.isPending,
    isRevokePending: revokeMember.isPending,
    handleInvite,
    handleRevoke,
  };
}
