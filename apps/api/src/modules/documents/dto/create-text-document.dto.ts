import { IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateTextDocumentDto {
  @ApiProperty({ description: "Document filename" })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ description: "Document text content" })
  @IsString()
  @MinLength(1)
  content!: string;
}
