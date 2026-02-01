/**
 * Parser pour les fichiers PDF.
 * Utilise pdf-parse pour extraire le texte et les métadonnées.
 */

/// <reference path="./declarations.d.ts" />
import pdfParse from 'pdf-parse';
import { BaseDocumentParser } from './base-parser';
import type { ParserInput, ParsedDocument, DocumentMetadata } from './types';
import { SUPPORTED_MIME_TYPES } from './types';

export class PdfParser extends BaseDocumentParser {
  readonly name = 'pdf';
  readonly supportedTypes = [SUPPORTED_MIME_TYPES.PDF] as const;

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const buffer = await this.fetchBuffer(input.source);

    try {
      const data = await pdfParse(buffer, {
        // Options de pdf-parse
        max: 0, // 0 = pas de limite de pages
      });

      const content = this.cleanText(data.text);

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
      };
    } catch (error) {
      if (error instanceof Error) {
        // Améliore le message d'erreur pour les PDFs corrompus
        if (
          error.message.includes('Invalid') ||
          error.message.includes('corrupt')
        ) {
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
      const match = dateStr.match(
        /D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/
      );

      if (match) {
        const [, year, month, day, hour = '00', min = '00', sec = '00'] = match;
        const date = new Date(
          `${year}-${month}-${day}T${hour}:${min}:${sec}Z`
        );

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
