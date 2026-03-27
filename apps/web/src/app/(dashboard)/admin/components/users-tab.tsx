'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarImage,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  AvatarFallback,
} from '@corpusai/ui';
import { useAdminUsers, useUpdateUserRole, useUpdateUserPlan } from '@/lib/queries';
import { SearchIcon } from '@/lib/icons';
import { STATUS_COLORS } from '../constants';
import { formatDateFR, userInitials } from '../utils';

export function UsersTab() {
  const [userSearch, setUserSearch] = React.useState('');
  const [userPage, setUserPage] = React.useState(1);

  const { data: usersData, isLoading: usersLoading } = useAdminUsers(
    userPage,
    userSearch || undefined
  );
  const updateRole = useUpdateUserRole();
  const updatePlan = useUpdateUserPlan();

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold text-tx-primary">Utilisateurs</CardTitle>
        <CardDescription className="text-[12px] text-tx-muted">
          Gerer les comptes et les plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tx-disabled" />
          <Input
            placeholder="Rechercher par email ou nom..."
            className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] pl-10 text-[13px] text-tx-primary placeholder:text-tx-disabled"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setUserPage(1);
            }}
          />
        </div>

        {usersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Utilisateur</TableHead>
                  <TableHead className="min-w-[100px]">Username</TableHead>
                  <TableHead className="min-w-[70px]">Plan</TableHead>
                  <TableHead className="min-w-[70px]">Role</TableHead>
                  <TableHead className="min-w-[50px] text-right">AIs</TableHead>
                  <TableHead className="min-w-[110px]">Inscrit le</TableHead>
                  <TableHead className="min-w-[120px]">Derniere activite</TableHead>
                  <TableHead className="min-w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersData?.users?.map((user) => {
                  const lastActivity = user.sessions?.[0]?.updatedAt;
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-7 w-7">
                            {user.image && (
                              <AvatarImage src={user.image} alt={user.name || user.email} />
                            )}
                            <AvatarFallback className="text-[10px]">
                              {userInitials(user.name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-tx-primary">
                              {user.name || user.email}
                            </p>
                            <p className="truncate text-[11px] text-tx-muted">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-tx-muted">
                        {user.username ? `@${user.username}` : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[user.subscriptionStatus] || 'secondary'}>
                          {user.subscriptionPlan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role === 'ADMIN' ? (
                          <Badge variant="default">Admin</Badge>
                        ) : (
                          <span className="text-tx-muted">User</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-tx-primary">
                        {user._count.ais}
                      </TableCell>
                      <TableCell className="text-tx-muted">
                        {formatDateFR(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-tx-muted">
                        {lastActivity ? formatDateFR(lastActivity) : '\u2014'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={user.subscriptionPlan}
                            onValueChange={(plan) => updatePlan.mutate({ userId: user.id, plan })}
                          >
                            <SelectTrigger className="h-7 w-[100px] border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[11px] text-tx-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'].map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() =>
                              updateRole.mutate({
                                userId: user.id,
                                role: user.role === 'ADMIN' ? 'USER' : 'ADMIN',
                              })
                            }
                          >
                            {user.role === 'ADMIN' ? 'Retirer admin' : 'Promouvoir'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {usersData?.pagination && usersData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[hsl(var(--border-subtle))] pt-3">
                <p className="text-[12px] text-tx-muted">
                  Page {usersData.pagination.page}/{usersData.pagination.totalPages} (
                  {usersData.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={userPage <= 1}
                    onClick={() => setUserPage((p) => p - 1)}
                  >
                    Precedent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={userPage >= usersData.pagination.totalPages}
                    onClick={() => setUserPage((p) => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
