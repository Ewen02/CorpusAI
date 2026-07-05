import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserRole } from '@corpusai/database';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, description: 'Role to assign to the user' })
  @IsEnum(UserRole)
  role!: UserRole;
}
