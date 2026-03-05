import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['CREATOR', 'PRO', 'ENTERPRISE'] })
  @IsString()
  @IsIn(['CREATOR', 'PRO', 'ENTERPRISE'])
  plan!: 'CREATOR' | 'PRO' | 'ENTERPRISE';

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsString()
  @IsIn(['monthly', 'yearly'])
  interval!: 'monthly' | 'yearly';
}
