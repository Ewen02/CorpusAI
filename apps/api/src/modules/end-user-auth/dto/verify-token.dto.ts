import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyTokenDto {
  @ApiProperty()
  @IsString()
  token!: string;
}
