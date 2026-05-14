import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shape of a document version returned to the dashboard.
 * Used for Swagger schema documentation on version endpoints.
 */
export class DocumentVersionDto {
  @ApiProperty({ description: 'Version id' })
  id!: string;

  @ApiProperty({ description: 'Parent document id' })
  documentId!: string;

  @ApiProperty({ description: 'Version number (starts at 1)' })
  version!: number;

  @ApiProperty({ description: 'Filename at version creation' })
  filename!: string;

  @ApiProperty({ description: 'MIME type of the version content' })
  mimeType!: string;

  @ApiProperty({ description: 'Size of the version content in bytes' })
  size!: number;

  @ApiPropertyOptional({ description: 'Storage URL (S3 / local)' })
  url?: string | null;

  @ApiProperty({ description: 'Number of chunks indexed for this version' })
  chunkCount!: number;

  @ApiPropertyOptional({ description: 'Word count extracted from the document' })
  wordCount?: number | null;

  @ApiPropertyOptional({ description: 'Page count when applicable' })
  pageCount?: number | null;

  @ApiProperty({
    description: 'Processing status of this version',
    enum: ['PENDING', 'PROCESSING', 'INDEXED', 'FAILED'],
  })
  status!: string;

  @ApiProperty({ description: 'Date the version was uploaded' })
  uploadedAt!: Date;

  @ApiProperty({ description: 'Whether this is the currently active version' })
  isActive!: boolean;

  @ApiPropertyOptional({ description: 'Extra metadata (title, author, language)' })
  metadata?: Record<string, unknown> | null;
}

export class RollbackResponseDto {
  @ApiProperty({ description: 'Indicates whether the operation succeeded' })
  success!: boolean;

  @ApiProperty({
    description: 'False when the requested version was already active (idempotent no-op)',
  })
  changed!: boolean;

  @ApiProperty({ description: 'Version that is now active' })
  activeVersion!: number;
}
