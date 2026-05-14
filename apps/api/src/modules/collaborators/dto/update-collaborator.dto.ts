import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CollaboratorRole } from '@corpusai/database';

export class UpdateCollaboratorDto {
  @ApiProperty({
    enum: CollaboratorRole,
    description: 'New role to assign to the collaborator',
  })
  @IsEnum(CollaboratorRole)
  role!: CollaboratorRole;
}
