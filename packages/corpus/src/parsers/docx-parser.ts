/**
 * Parser pour les fichiers DOCX (Microsoft Word).
 * Utilise mammoth pour extraire le texte brut.
 */

import mammoth from 'mammoth';
import { BaseDocumentParser } from './base-parser';
import type { ParserInput, ParsedDocument, DocumentMetadata } from './types';
import { SUPPORTED_MIME_TYPES } from './types';

export class DocxParser extends BaseDocumentParser {
  readonly name = 'docx';
  readonly supportedTypes = [SUPPORTED_MIME_TYPES.DOCX] as const;

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const buffer = await this.fetchBuffer(input.source);

    try {
      // Extraire le texte brut (meilleur pour RAG que le HTML)
      const result = await mammoth.extractRawText({ buffer });

      // Log les warnings mais continue
      if (result.messages.length > 0) {
        const warnings = result.messages
          .filter((m) => m.type === 'warning')
          .map((m) => m.message);
        if (warnings.length > 0) {
          console.warn(`DOCX parsing warnings for ${input.filename}:`, warnings);
        }
      }

      const content = this.cleanText(result.value);

      if (!content || content.length === 0) {
        throw new Error('DOCX document contains no extractable text.');
      }

      // DOCX ne fournit pas facilement le nombre de pages
      // On estime ~3000 caractères par page (standard Word)
      const estimatedPageCount = Math.max(1, Math.ceil(content.length / 3000));

      const metadata: DocumentMetadata = {
        mimeType: input.mimeType,
        fileName: input.filename,
        fileSize: buffer.length,
        // Note: Pour extraire les métadonnées DOCX (author, title),
        // il faudrait parser le fichier docProps/core.xml dans le ZIP
        // Pour l'instant on laisse undefined
      };

      return {
        content,
        metadata,
        pageCount: estimatedPageCount,
        wordCount: this.countWords(content),
      };
    } catch (error) {
      if (error instanceof Error) {
        // Améliore le message d'erreur
        if (
          error.message.includes('Could not find') ||
          error.message.includes('corrupt')
        ) {
          throw new Error(`Invalid or corrupted DOCX file: ${error.message}`);
        }
        throw error;
      }
      throw new Error('Failed to parse DOCX document');
    }
  }
}
