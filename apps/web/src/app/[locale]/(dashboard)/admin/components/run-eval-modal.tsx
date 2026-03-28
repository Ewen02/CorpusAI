'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import { useEvalDatasets, useRunEval } from '@/lib/queries';

interface RunEvalModalProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RunEvalModal({ slug: defaultSlug, open, onOpenChange }: RunEvalModalProps) {
  const { data: datasets } = useEvalDatasets();
  const { mutate: runEval, isPending, isSuccess, error } = useRunEval();
  const [selectedDataset, setSelectedDataset] = React.useState('');
  const [selectedSlug, setSelectedSlug] = React.useState(defaultSlug);

  React.useEffect(() => {
    if (datasets?.length && !selectedDataset) setSelectedDataset(datasets[0]!);
  }, [datasets, selectedDataset]);

  React.useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => onOpenChange(false), 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lancer un run d'evaluation</DialogTitle>
          <DialogDescription>Selectionne l'AI et le dataset a evaluer.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">AI Slug</label>
            <Input
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              placeholder="ex: marketing-digital"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Dataset</label>
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un dataset..." />
              </SelectTrigger>
              <SelectContent>
                {datasets?.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isPending && (
            <p className="text-xs text-muted-foreground">
              Evaluation en cours... (peut prendre 2-3 minutes)
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500">
              Erreur : {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {isSuccess && <p className="text-xs text-green-500">Run termine, rapport enregistre.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
              Fermer
            </Button>
            <Button
              disabled={isPending || !selectedSlug || !selectedDataset}
              onClick={() => runEval({ slug: selectedSlug, dataset: selectedDataset })}
            >
              {isPending ? 'En cours...' : 'Lancer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
