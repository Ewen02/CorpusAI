import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SubscriptionPlan } from '@corpusai/database';

export class UpdateUserPlanDto {
  @ApiProperty({ enum: SubscriptionPlan, description: 'Subscription plan to assign to the user' })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}
