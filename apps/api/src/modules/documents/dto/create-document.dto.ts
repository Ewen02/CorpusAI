import { IsString, IsNumber, IsOptional, Min, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateDocumentDto {
  @ApiProperty({ description: "Original filename" })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ description: "MIME type of the file" })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: "File size in bytes" })
  @IsNumber()
  @Min(0)
  size!: number;

  @ApiPropertyOptional({ description: "URL to the uploaded file" })
  @IsOptional()
  @IsString()
  url?: string;
}
