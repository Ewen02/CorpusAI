import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class MagicLinkDto {
  @ApiProperty({ example: 'marie@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'ma-formation' })
  @IsOptional()
  @IsString()
  aiSlug?: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'AI creator username' })
  @IsOptional()
  @IsString()
  username?: string;
}
