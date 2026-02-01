/**
 * Types pour les parsers de documents.
 */

/**
 * Document parsé avec son contenu et métadonnées extraites
 */
export interface ParsedDocument {
  /** Contenu textuel extrait */
  content: string;
  /** Métadonnées du document */
  metadata: DocumentMetadata;
  /** Nombre de pages (PDF, DOCX) */
  pageCount?: number;
  /** Nombre de mots */
  wordCount: number;
}

/**
 * Métadonnées extraites d'un document
 */
export interface DocumentMetadata {
  /** Titre du document */
  title?: string;
  /** Auteur du document */
  author?: string;
  /** Date de création */
  createdAt?: Date;
  /** Date de modification */
  modifiedAt?: Date;
  /** Langue détectée (ISO 639-1) */
  language?: string;
  /** Encoding original (pour fichiers texte) */
  encoding?: string;
  /** Type MIME original */
  mimeType: string;
  /** Nom du fichier */
  fileName: string;
  /** Taille du fichier en bytes */
  fileSize?: number;
}

/**
 * Input pour le parsing
 */
export interface ParserInput {
  /** Buffer du fichier ou URL */
  source: Buffer | string;
  /** Nom du fichier original */
  filename: string;
  /** Type MIME */
  mimeType: string;
}

/**
 * Interface abstraite pour un parser de documents
 */
export interface DocumentParser {
  /** Types MIME supportés par ce parser */
  readonly supportedTypes: readonly string[];

  /** Nom du parser */
  readonly name: string;

  /** Vérifie si le parser peut traiter ce type MIME */
  canParse(mimeType: string): boolean;

  /** Parse un document et extrait le texte */
  parse(input: ParserInput): Promise<ParsedDocument>;
}

/**
 * Types MIME supportés
 */
export const SUPPORTED_MIME_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword',
  TEXT: 'text/plain',
  MARKDOWN: 'text/markdown',
  HTML: 'text/html',
  CSV: 'text/csv',
} as const;

export type SupportedMimeType =
  (typeof SUPPORTED_MIME_TYPES)[keyof typeof SUPPORTED_MIME_TYPES];
