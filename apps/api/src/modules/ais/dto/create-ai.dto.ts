import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AccessType } from "@corpusai/database";

export class CreateAIDto {
  @ApiProperty({ description: "AI name", minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: "URL-friendly slug (lowercase, hyphens only)",
    pattern: "^[a-z0-9-]+$",
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug!: string;

  @ApiPropertyOptional({ description: "AI description", maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: "System prompt for the AI" })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @ApiPropertyOptional({ description: "Welcome message shown to users" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  welcomeMessage?: string;

  @ApiPropertyOptional({
    description: "Primary color (hex)",
    default: "#3b82f6",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "Invalid hex color" })
  primaryColor?: string;

  @ApiPropertyOptional({ enum: AccessType, default: AccessType.FREE })
  @IsOptional()
  @IsEnum(AccessType)
  accessType?: AccessType;

  @ApiPropertyOptional({ description: "Price if access type is PAID" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: "Max tokens per response", default: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4096)
  maxTokens?: number;

  @ApiPropertyOptional({ description: "Temperature (0-1)", default: 0.7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;
}
