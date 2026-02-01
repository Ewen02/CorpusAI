/**
 * Parser pour les fichiers texte (TXT, Markdown).
 * Détecte automatiquement l'encoding et convertit en UTF-8.
 */

/// <reference path="./declarations.d.ts" />
import * as chardet from 'chardet';
import iconv from 'iconv-lite';
import { BaseDocumentParser } from './base-parser';
import type { ParserInput, ParsedDocument, DocumentMetadata } from './types';
import { SUPPORTED_MIME_TYPES } from './types';

export class TextParser extends BaseDocumentParser {
  readonly name = 'text';
  readonly supportedTypes = [
    SUPPORTED_MIME_TYPES.TEXT,
    SUPPORTED_MIME_TYPES.MARKDOWN,
    SUPPORTED_MIME_TYPES.CSV,
    SUPPORTED_MIME_TYPES.HTML,
  ] as const;

  async parse(input: ParserInput): Promise<ParsedDocument> {
    const buffer = await this.fetchBuffer(input.source);

    // Détecte l'encoding
    const detectedEncoding = chardet.detect(buffer) || 'utf-8';
    const encoding = this.normalizeEncoding(detectedEncoding);

    // Convertit en UTF-8
    let content: string;
    if (encoding === 'utf-8' || encoding === 'ascii') {
      content = buffer.toString('utf-8');
    } else {
      content = iconv.decode(buffer, encoding);
    }

    content = this.cleanText(content);

    // Pour HTML, on extrait le texte brut
    if (input.mimeType === SUPPORTED_MIME_TYPES.HTML) {
      content = this.stripHtml(content);
    }

    if (!content || content.length === 0) {
      throw new Error('Text document is empty.');
    }

    // Extrait le titre depuis la première ligne si c'est un header Markdown
    const title = this.extractTitle(content, input.mimeType);

    const metadata: DocumentMetadata = {
      mimeType: input.mimeType,
      fileName: input.filename,
      fileSize: buffer.length,
      encoding,
      title,
    };

    return {
      content,
      metadata,
      wordCount: this.countWords(content),
    };
  }

  /**
   * Normalise le nom de l'encoding pour iconv-lite
   */
  private normalizeEncoding(encoding: string): string {
    const normalized = encoding.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Mappings courants
    const encodingMap: Record<string, string> = {
      utf8: 'utf-8',
      ascii: 'ascii',
      iso88591: 'iso-8859-1',
      iso885915: 'iso-8859-15',
      windows1252: 'windows-1252',
      cp1252: 'windows-1252',
      latin1: 'iso-8859-1',
      utf16le: 'utf-16le',
      utf16be: 'utf-16be',
    };

    return encodingMap[normalized] || encoding;
  }

  /**
   * Extrait le titre depuis le contenu
   */
  private extractTitle(
    content: string,
    mimeType: string
  ): string | undefined {
    const firstLine = content.split('\n')[0]?.trim();

    if (!firstLine) return undefined;

    // Markdown: première ligne qui commence par #
    if (
      mimeType === SUPPORTED_MIME_TYPES.MARKDOWN ||
      mimeType === SUPPORTED_MIME_TYPES.TEXT
    ) {
      if (firstLine.startsWith('#')) {
        return firstLine.replace(/^#+\s*/, '').trim();
      }
    }

    // HTML: contenu de la balise <title>
    if (mimeType === SUPPORTED_MIME_TYPES.HTML) {
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        return titleMatch[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Supprime les balises HTML et retourne le texte brut
   */
  private stripHtml(html: string): string {
    return (
      html
        // Supprime les scripts et styles
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remplace les balises de bloc par des sauts de ligne
        .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
        .replace(/<(br|hr)[^>]*\/?>/gi, '\n')
        // Supprime toutes les autres balises
        .replace(/<[^>]+>/g, '')
        // Décode les entités HTML courantes
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Nettoie
        .trim()
    );
  }
}
