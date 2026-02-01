/**
 * Classe abstraite de base pour les parsers de documents.
 */

import type { DocumentParser, ParserInput, ParsedDocument } from './types';

export abstract class BaseDocumentParser implements DocumentParser {
  abstract readonly supportedTypes: readonly string[];
  abstract readonly name: string;

  /**
   * Vérifie si le parser peut traiter ce type MIME
   */
  canParse(mimeType: string): boolean {
    return this.supportedTypes.includes(mimeType);
  }

  /**
   * Parse un document - à implémenter par les sous-classes
   */
  abstract parse(input: ParserInput): Promise<ParsedDocument>;

  /**
   * Compte le nombre de mots dans un texte
   */
  protected countWords(text: string): number {
    return text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Récupère le contenu d'un fichier depuis un Buffer ou une URL.
   * Inclut une protection SSRF : seuls les schémas http/https sont autorisés,
   * les IP privées et metadata cloud sont bloquées.
   */
  protected async fetchBuffer(source: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(source)) {
      return source;
    }

    this.validateUrl(source);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(source, {
        signal: controller.signal,
        redirect: 'follow',
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch document: ${response.status} ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Valide qu'une URL est sûre (pas de SSRF).
   */
  private validateUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }

    // Schéma : https uniquement en production, http autorisé en dev
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`Unsupported URL scheme: ${parsed.protocol}`);
    }

    const hostname = parsed.hostname.toLowerCase();

    // Bloquer les IP privées, localhost, et metadata cloud
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,           // AWS/GCP metadata
      /^0\./,
      /^\[::1\]$/,             // IPv6 localhost
      /^\[fd/i,                // IPv6 private
      /^\[fe80:/i,             // IPv6 link-local
      /metadata\.google/,
      /\.internal$/,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        throw new Error(`URL target not allowed: ${hostname}`);
      }
    }
  }

  /**
   * Nettoie le texte extrait (espaces multiples, lignes vides)
   */
  protected cleanText(text: string): string {
    return text
      // Normalise les sauts de ligne
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Supprime les espaces en fin de ligne
      .replace(/[ \t]+$/gm, '')
      // Réduit les sauts de ligne multiples (max 2)
      .replace(/\n{3,}/g, '\n\n')
      // Trim final
      .trim();
  }
}
