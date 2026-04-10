'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
  Badge,
  Label,
} from '@corpusai/ui';

interface DebugResult {
  question: string;
  threshold: number;
  resultsCount: number;
  results: Array<{
    rank: number;
    score: number;
    source: string;
    documentId: string;
    excerpt: string;
  }>;
  analysis: {
    avgScore: number;
    maxScore: number;
    minScore: number;
    allAboveThreshold: boolean;
    recommendation: string;
  };
}

interface DebugTabProps {
  aiId: string;
}

/**
 * Debug tab for testing RAG queries and viewing retrieval scores.
 * Helps diagnose issues with document matching and relevance.
 */
export const DebugTab = React.memo(function DebugTab({ aiId }: DebugTabProps) {
  const [query, setQuery] = React.useState('');
  const [threshold, setThreshold] = React.useState(0.6);
  const [topK, setTopK] = React.useState(5);
  const [result, setResult] = React.useState<DebugResult | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDebug = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        threshold: threshold.toString(),
        topK: topK.toString(),
      });
      const res = await fetch(`/api/rag/${aiId}/debug-query?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la requete');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500/20 text-green-400';
    if (score >= 0.5) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <Card>
        <CardHeader>
          <CardTitle>Debug RAG</CardTitle>
          <CardDescription>
            Testez une question pour voir les chunks recuperes et leurs scores de similarite. Cela
            permet de diagnostiquer les problemes de retrieval sans appeler le LLM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              placeholder="Posez une question de test..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDebug()}
              className="flex-1"
            />
            <Button onClick={handleDebug} disabled={isLoading || !query.trim()}>
              {isLoading ? 'Analyse...' : 'Analyser'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-3">
              <Label htmlFor="threshold" className="whitespace-nowrap text-muted-foreground">
                Seuil de pertinence:
              </Label>
              <input
                id="threshold"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-24 accent-primary"
              />
              <span className="w-8 text-center font-mono">{threshold.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="topK" className="whitespace-nowrap text-muted-foreground">
                Nombre de resultats:
              </Label>
              <input
                id="topK"
                type="number"
                min="1"
                max="20"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value) || 5)}
                className="w-16 rounded border border-[hsl(var(--border-default))] bg-background px-2 py-1 text-center"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Analysis Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analyse</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Chunks</p>
                  <p className="text-2xl font-bold">{result.resultsCount}</p>
                </div>
                <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Score moyen</p>
                  <p className="text-2xl font-bold">{result.analysis.avgScore.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Score max</p>
                  <p className="text-2xl font-bold">{result.analysis.maxScore.toFixed(2)}</p>
                </div>
                <div className="rounded-lg bg-[hsl(var(--surface-2))] p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Au-dessus seuil</p>
                  <Badge
                    className={
                      result.analysis.allAboveThreshold
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }
                  >
                    {result.analysis.allAboveThreshold ? 'Oui' : 'Non'}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] p-4">
                <p className="mb-1 text-sm font-medium">Recommandation</p>
                <p className="text-sm text-muted-foreground">{result.analysis.recommendation}</p>
              </div>
            </CardContent>
          </Card>

          {/* Retrieved Chunks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chunks recuperes</CardTitle>
              <CardDescription>
                Chunks les plus similaires a votre question, tries par score decroissant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {result.results.map((r) => (
                <div
                  key={`${r.documentId}-${r.rank}`}
                  className="rounded-lg border border-[hsl(var(--border-default))] p-4 transition-colors hover:border-muted-foreground/30"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{r.rank}</span>
                      <Badge variant="outline" className="font-normal">
                        {r.source}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full ${getScoreBgColor(r.score)} transition-all`}
                          style={{ width: `${r.score * 100}%` }}
                        />
                      </div>
                      <Badge className={getScoreColor(r.score)}>{r.score.toFixed(3)}</Badge>
                    </div>
                  </div>
                  <p className="line-clamp-4 text-sm text-muted-foreground">{r.excerpt}</p>
                </div>
              ))}
              {result.results.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">Aucun chunk trouve pour cette question.</p>
                  <p className="mt-1 text-sm text-muted-foreground/70">
                    Verifiez que des documents sont indexes pour cet assistant.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty state */}
      {!result && !error && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Entrez une question ci-dessus pour analyser la pertinence des documents.
            </p>
            <p className="mt-2 text-sm text-muted-foreground/70">
              Le seuil par defaut est 0.6. Les scores en dessous seront filtres lors des vraies
              requetes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
