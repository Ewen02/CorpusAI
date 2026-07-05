/**
 * Parser pour les fichiers PDF.
 * Utilise pdf-parse pour extraire le texte et les métadonnées.
 */

import pdfParse from 'pdf-parse';
import { BaseDocumentParser } from './base-parser';
import type { ParserInput, ParsedDocument, DocumentMetadata, PageOffset } from './types';
import { SUPPORTED_MIME_TYPES } from './types';

/**
 * Item de texte pdf.js minimal (str + matrice de transformation pour le Y).
 */
interface PdfTextItem {
  str: string;
  transform: number[];
}

/**
 * Page pdf.js minimale telle que passée par pdf-parse au callback pagerender.
 */
interface PdfPageData {
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfTextItem[] }>;
}

/**
 * Rend le texte d'une page — reproduit le rendu par défaut de pdf-parse
 * (saut de ligne quand la coordonnée Y change) pour que le texte reste
 * identique à l'ancien comportement.
 */
async function renderPageText(pageData: PdfPageData): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  let lastY: number | undefined;
  let text = '';
  for (const item of textContent.items) {
    const y = item.transform[5];
    if (lastY === y || lastY === undefined) {
      text += item.str;
    } else {
      text += `\n${item.str}`;
    }
    lastY = y;
  }
  return text;
}

export class PdfParser extends BaseDocumentParser {
  readonly name = 'pdf';
  readonly supportedTypes = [SUPPORTED_MIME_TYPES.PDF] as const;

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const buffer = await this.fetchBuffer(input.source);

    try {
      // pdf-parse appelle pagerender séquentiellement page par page : on
      // collecte le texte de chaque page pour construire la carte des offsets
      // (chunk → page) utilisée par les citations.
      const pageTexts: string[] = [];
      const data = await pdfParse(buffer, {
        max: 0, // 0 = pas de limite de pages
        pagerender: async (pageData: unknown) => {
          const text = await renderPageText(pageData as PdfPageData);
          pageTexts.push(text);
          return text;
        },
      });

      // Reconstruit le contenu à partir des pages nettoyées individuellement,
      // en gardant l'offset [start, end) de chaque page dans le contenu final.
      const pages: PageOffset[] = [];
      let content = '';
      for (let i = 0; i < pageTexts.length; i++) {
        const pageText = this.cleanText(pageTexts[i] ?? '');
        if (!pageText) continue; // page vide (scannée/image) — pas d'offset
        if (content.length > 0) content += '\n\n';
        const startOffset = content.length;
        content += pageText;
        pages.push({ pageNumber: i + 1, startOffset, endOffset: content.length });
      }

      // Fallback : si la collecte par page n'a rien donné (pagerender non
      // appelé par une version exotique de pdf-parse), on garde l'ancien
      // comportement — texte global, sans carte de pages.
      if (content.length === 0) {
        content = this.cleanText(data.text);
      }

      if (!content || content.length === 0) {
        throw new Error(
          'PDF contains no extractable text. It may be a scanned document or image-based PDF.'
        );
      }

      const metadata: DocumentMetadata = {
        mimeType: input.mimeType,
        fileName: input.filename,
        fileSize: buffer.length,
        title: data.info?.Title || undefined,
        author: data.info?.Author || undefined,
        createdAt: this.parsePdfDate(data.info?.CreationDate),
        modifiedAt: this.parsePdfDate(data.info?.ModDate),
      };

      return {
        content,
        metadata,
        pageCount: data.numpages,
        wordCount: this.countWords(content),
        ...(pages.length > 0 && { pages }),
      };
    } catch (error) {
      if (error instanceof Error) {
        // Améliore le message d'erreur pour les PDFs corrompus
        if (error.message.includes('Invalid') || error.message.includes('corrupt')) {
          throw new Error(`Invalid or corrupted PDF file: ${error.message}`);
        }
        throw error;
      }
      throw new Error('Failed to parse PDF document');
    }
  }

  /**
   * Parse une date au format PDF (D:YYYYMMDDHHmmSS)
   */
  private parsePdfDate(dateStr?: string): Date | undefined {
    if (!dateStr) return undefined;

    try {
      // Format PDF: D:YYYYMMDDHHmmSS+HH'mm' ou D:YYYYMMDDHHmmSS
      const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);

      if (match) {
        const [, year, month, day, hour = '00', min = '00', sec = '00'] = match;
        const date = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);

        // Vérifie que la date est valide
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    } catch {
      // Ignore les erreurs de parsing de date
    }

    return undefined;
  }
}
