import type { Chunk } from './types';

/** Offset d'une page dans le contenu d'un document (voir parsers/types PageOffset) */
export interface PageRange {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Fenêtre de recul pour la recherche du chunk dans le contenu : les chunkers
 * produisent un overlap (~50 tokens ≈ 200-400 chars) qui fait remonter le début
 * d'un chunk AVANT le curseur de fin du chunk précédent.
 */
const SEARCH_BACKTRACK_CHARS = 2_000;

/**
 * Assigne `metadata.pageNumber` à chaque chunk en localisant son texte dans le
 * contenu source, puis en résolvant la page dont la plage [start, end) contient
 * le début du chunk.
 *
 * Les chunks arrivent dans l'ordre du document : la recherche avance avec un
 * curseur (avec recul d'overlap) pour éviter de matcher une occurrence
 * antérieure d'un texte répété. Un chunk introuvable (texte re-trimé, CSV
 * fallback…) garde pageNumber undefined — jamais d'assignation fausse.
 *
 * Mutation en place : les chunks référencent le pageNumber dans leur metadata,
 * qui suit ensuite le chunk jusqu'au payload Qdrant et à la DB.
 */
export function assignPageNumbers(chunks: Chunk[], content: string, pages: PageRange[]): void {
  if (chunks.length === 0 || pages.length === 0) return;

  const sortedPages = [...pages].sort((a, b) => a.startOffset - b.startOffset);

  const pageForOffset = (offset: number): number | undefined => {
    for (const page of sortedPages) {
      if (offset >= page.startOffset && offset < page.endOffset) {
        return page.pageNumber;
      }
    }
    // Offset entre deux pages (séparateur \n\n) : rattache à la page suivante
    for (const page of sortedPages) {
      if (offset < page.startOffset) return page.pageNumber;
    }
    return undefined;
  };

  let cursor = 0;
  for (const chunk of chunks) {
    const text = chunk.text;
    if (!text) continue;

    // Ordre de recherche : depuis le curseur d'abord (cas nominal, gère les
    // textes répétés sur plusieurs pages), puis avec recul d'overlap (un chunk
    // peut commencer avant la fin du précédent), enfin depuis le début
    // (texte déplacé par trim).
    let index = content.indexOf(text, cursor);
    if (index === -1) {
      index = content.indexOf(text, Math.max(0, cursor - SEARCH_BACKTRACK_CHARS));
    }
    if (index === -1) {
      index = content.indexOf(text);
    }
    if (index === -1) continue;

    const pageNumber = pageForOffset(index);
    if (pageNumber !== undefined) {
      chunk.metadata.pageNumber = pageNumber;
    }
    cursor = index + text.length;
  }
}
