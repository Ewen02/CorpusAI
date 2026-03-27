'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@corpusai/ui';
import { useAdminAIs } from '@/lib/queries';
import { SearchIcon } from '@/lib/icons';
import { ExternalLink, Globe, Eye } from 'lucide-react';
import { AI_STATUS_STYLES } from '../constants';
import { formatDateFR } from '../utils';

export function AIsTab() {
  const [aiSearch, setAiSearch] = React.useState('');
  const [aiPage, setAiPage] = React.useState(1);

  const { data: aisData, isLoading: aisLoading } = useAdminAIs(aiPage, aiSearch || undefined);

  return (
    <Card variant="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-[13px] font-semibold text-tx-primary">AIs</CardTitle>
        <CardDescription className="text-[12px] text-tx-muted">
          Tous les assistants de la plateforme.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tx-disabled" />
          <Input
            placeholder="Rechercher par nom ou slug..."
            className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] pl-10 text-[13px] text-tx-primary placeholder:text-tx-disabled"
            value={aiSearch}
            onChange={(e) => {
              setAiSearch(e.target.value);
              setAiPage(1);
            }}
          />
        </div>

        {aisLoading ? (
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
                  <TableHead className="min-w-[180px]">Assistant</TableHead>
                  <TableHead className="min-w-[100px]">Createur</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[60px] text-center">Public</TableHead>
                  <TableHead className="min-w-[50px] text-right">Docs</TableHead>
                  <TableHead className="min-w-[50px] text-right">Convs</TableHead>
                  <TableHead className="min-w-[70px] pr-6 text-right">Questions</TableHead>
                  <TableHead className="min-w-[110px]">Cree le</TableHead>
                  <TableHead className="min-w-[130px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aisData?.ais?.map((ai) => {
                  const statusStyle = AI_STATUS_STYLES[ai.status] ?? AI_STATUS_STYLES.ARCHIVED!;
                  return (
                    <TableRow key={ai.id}>
                      <TableCell>
                        <p className="font-medium text-tx-primary">{ai.name}</p>
                        <p className="text-[11px] text-tx-muted">/{ai.slug}</p>
                      </TableCell>
                      <TableCell className="text-tx-muted">
                        {ai.user.name || ai.user.email}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${statusStyle.dot}`}
                          />
                          {ai.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {ai.isPublic ? (
                          <Globe className="mx-auto h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Eye className="mx-auto h-3.5 w-3.5 text-tx-disabled" />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-tx-primary">
                        {ai.documentCount}
                      </TableCell>
                      <TableCell className="text-right font-mono text-tx-primary">
                        {ai.conversationCount}
                      </TableCell>
                      <TableCell className="pr-6 text-right font-mono text-tx-primary">
                        {ai.questionCount}
                      </TableCell>
                      <TableCell className="text-tx-muted">{formatDateFR(ai.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-[11px]"
                            asChild
                          >
                            <Link href={`/chat/${ai.slug}`} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                              Tester
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
                            <Link href={`/ais/${ai.id}`}>Voir</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {aisData?.pagination && aisData.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[hsl(var(--border-subtle))] pt-3">
                <p className="text-[12px] text-tx-muted">
                  Page {aisData.pagination.page}/{aisData.pagination.totalPages} (
                  {aisData.pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={aiPage <= 1}
                    onClick={() => setAiPage((p) => p - 1)}
                  >
                    Precedent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    disabled={aiPage >= aisData.pagination.totalPages}
                    onClick={() => setAiPage((p) => p + 1)}
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
