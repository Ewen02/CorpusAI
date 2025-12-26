import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateAIDto } from "./create-ai.dto";
import { IsEnum, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AIStatus } from "@corpusai/database";

export class UpdateAIDto extends PartialType(
  OmitType(CreateAIDto, ["slug"] as const)
) {
  @ApiPropertyOptional({ enum: AIStatus })
  @IsOptional()
  @IsEnum(AIStatus)
  status?: AIStatus;
}
