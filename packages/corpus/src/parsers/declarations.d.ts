/**
 * Type declarations for modules without TypeScript support.
 */

declare module 'pdf-parse' {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    [key: string]: unknown;
  }

  interface PDFMetadata {
    _metadata?: Record<string, unknown>;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata | null;
    text: string;
    version: string;
  }

  interface PDFOptions {
    max?: number;
    version?: string;
    pagerender?: (pageData: unknown) => string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: PDFOptions
  ): Promise<PDFData>;

  export = pdfParse;
}

declare module 'chardet' {
  function detect(buffer: Buffer): string | null;
  function detectFile(path: string): Promise<string | null>;
  function detectFileSync(path: string): string | null;

  export { detect, detectFile, detectFileSync };
}
