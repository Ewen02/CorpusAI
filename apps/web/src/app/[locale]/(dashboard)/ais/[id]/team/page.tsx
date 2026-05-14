'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import {
  useCollaborators,
  useRevokeCollaborator,
  useUpdateCollaborator,
  type Collaborator,
  type CollaboratorRole,
} from '@/lib/queries';
import { reportError } from '@/lib/log';
import { InviteCollaboratorModal } from './components/invite-collaborator-modal';

export default function AITeamPage() {
  const params = useParams<{ id: string }>();
  const aiId = params.id;
  const t = useTranslations('ai.team');
  const { data, isLoading } = useCollaborators(aiId);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-tx-muted">{t('subtitle')}</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          {t('invite')}
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t('tabLabel')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !data || data.length === 0 ? (
            <div className="rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-6 text-center">
              <p className="text-sm font-medium">{t('empty')}</p>
              <p className="mt-1 text-xs text-tx-muted">{t('emptyDescription')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columnMember')}</TableHead>
                  <TableHead>{t('columnRole')}</TableHead>
                  <TableHead>{t('columnStatus')}</TableHead>
                  <TableHead>{t('columnInvited')}</TableHead>
                  <TableHead aria-label={t('changeRole')} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((collab) => (
                  <CollaboratorRow key={collab.id} aiId={aiId} collaborator={collab} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteCollaboratorModal aiId={aiId} open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}

function CollaboratorRow({ aiId, collaborator }: { aiId: string; collaborator: Collaborator }) {
  const t = useTranslations('ai.team');
  const update = useUpdateCollaborator(aiId);
  const revoke = useRevokeCollaborator(aiId);

  const displayName = collaborator.user?.name ?? collaborator.email;
  const isPending = !collaborator.acceptedAt;

  const handleRoleChange = async (role: CollaboratorRole) => {
    try {
      await update.mutateAsync({ id: collaborator.id, role });
    } catch (err) {
      reportError('Failed to update collaborator role', err, { aiId, id: collaborator.id });
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm(t('revokeConfirmDescription'))) return;
    try {
      await revoke.mutateAsync(collaborator.id);
    } catch (err) {
      reportError('Failed to revoke collaborator', err, { aiId, id: collaborator.id });
    }
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="text-[13px] font-medium">{displayName}</span>
          {collaborator.user?.name && (
            <span className="text-[11px] text-tx-muted">{collaborator.email}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={collaborator.role}
          onValueChange={(v) => handleRoleChange(v as CollaboratorRole)}
        >
          <SelectTrigger className="h-8 w-32 text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EDITOR">{t('roleEditor')}</SelectItem>
            <SelectItem value="VIEWER">{t('roleViewer')}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Badge variant={isPending ? 'secondary' : 'default'}>
          {isPending ? t('statusPending') : t('statusActive')}
        </Badge>
      </TableCell>
      <TableCell className="text-[12px] text-tx-muted">
        {new Date(collaborator.invitedAt).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRevoke}
          disabled={revoke.isPending}
          className="text-[hsl(var(--danger))]"
        >
          {revoke.isPending ? '…' : t('revoke')}
        </Button>
      </TableCell>
    </TableRow>
  );
}
