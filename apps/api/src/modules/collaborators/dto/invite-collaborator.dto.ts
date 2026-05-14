import { IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollaboratorRole } from '@corpusai/database';

export class InviteCollaboratorDto {
  @ApiProperty({ description: 'Email of the user to invite', format: 'email' })
  @IsEmail({}, { message: 'Invalid email address' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    enum: CollaboratorRole,
    default: CollaboratorRole.EDITOR,
    description: 'Role granted to the collaborator',
  })
  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;
}
