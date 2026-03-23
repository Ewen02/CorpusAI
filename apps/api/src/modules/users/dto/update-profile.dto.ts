import { IsString, IsOptional, IsUrl, IsObject, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User display name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsUrl()
  image?: string;

  @ApiPropertyOptional({
    description:
      'Public username for creator profile URL (3-30 chars, letters/numbers/underscore/hyphen)',
    pattern: '^[a-zA-Z0-9_-]{3,30}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{3,30}$/, {
    message:
      'Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ description: 'Short public bio', maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  bio?: string;

  @ApiPropertyOptional({ description: 'Notification preferences as key-value pairs' })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;
}
