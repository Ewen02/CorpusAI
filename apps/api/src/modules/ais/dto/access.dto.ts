import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SetAccessCodeDto {
  @ApiProperty({ example: 'FORMATION2025' })
  @IsString()
  @MinLength(4)
  code!: string;
}

export class UpdateInviteOnlyDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  inviteOnly!: boolean;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'marie@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Optional member name' })
  @IsOptional()
  @IsString()
  name?: string;
}
