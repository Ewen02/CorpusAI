/**
 * Module de parsing de documents.
 * Fournit un service unifié pour parser différents types de documents.
 */

export type {
  DocumentParser,
  ParserInput,
  ParsedDocument,
  DocumentMetadata,
  SupportedMimeType,
} from './types';

export { SUPPORTED_MIME_TYPES } from './types';
export { BaseDocumentParser } from './base-parser';
export { PdfParser } from './pdf-parser';
export { DocxParser } from './docx-parser';
export { TextParser } from './text-parser';

import type { DocumentParser, ParserInput, ParsedDocument } from './types';
import { PdfParser } from './pdf-parser';
import { DocxParser } from './docx-parser';
import { TextParser } from './text-parser';

/**
 * Service unifié pour parser tous les types de documents supportés.
 */
export class DocumentParserService {
  private parsers: DocumentParser[];

  constructor(customParsers: DocumentParser[] = []) {
    // Parsers par défaut
    this.parsers = [
      new PdfParser(),
      new DocxParser(),
      new TextParser(),
      // Parsers custom en priorité
      ...customParsers,
    ];
  }

  /**
   * Parse un document basé sur son type MIME.
   *
   * @param input - Input contenant le fichier et ses métadonnées
   * @returns Le document parsé avec son contenu et métadonnées
   * @throws Error si le type n'est pas supporté ou si le parsing échoue
   */
  async parse(input: ParserInput): Promise<ParsedDocument> {
    const parser = this.findParser(input.mimeType);

    if (!parser) {
      const supported = this.getSupportedTypes().join(', ');
      throw new Error(
        `Unsupported document type: ${input.mimeType}. ` +
          `Supported types: ${supported}`
      );
    }

    return parser.parse(input);
  }

  /**
   * Vérifie si un type MIME est supporté.
   */
  canParse(mimeType: string): boolean {
    return this.parsers.some((p) => p.canParse(mimeType));
  }

  /**
   * Retourne la liste de tous les types MIME supportés.
   */
  getSupportedTypes(): string[] {
    const types = new Set<string>();
    for (const parser of this.parsers) {
      for (const type of parser.supportedTypes) {
        types.add(type);
      }
    }
    return Array.from(types);
  }

  /**
   * Enregistre un parser custom (prioritaire sur les parsers par défaut).
   */
  registerParser(parser: DocumentParser): void {
    // Les parsers custom sont ajoutés au début pour avoir la priorité
    this.parsers.unshift(parser);
  }

  /**
   * Trouve le parser approprié pour un type MIME.
   */
  private findParser(mimeType: string): DocumentParser | undefined {
    return this.parsers.find((p) => p.canParse(mimeType));
  }
}
