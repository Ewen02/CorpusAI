import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { AIsService } from "./ais.service";
import { AuthGuard, CurrentUser, type CurrentUserData } from "../auth";
import { CreateAIDto } from "./dto/create-ai.dto";
import { UpdateAIDto } from "./dto/update-ai.dto";

@ApiTags("ais")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("ais")
export class AIsController {
  constructor(private readonly aisService: AIsService) {}

  @Get()
  @ApiOperation({ summary: "List all AIs for current user" })
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.aisService.findAll(user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get AI by ID" })
  @ApiParam({ name: "id", description: "AI ID" })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.aisService.findOne(user.id, id);
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Get AI statistics" })
  @ApiParam({ name: "id", description: "AI ID" })
  async getStats(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.aisService.getStats(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new AI" })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateAIDto
  ) {
    return this.aisService.create(user.id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update an AI" })
  @ApiParam({ name: "id", description: "AI ID" })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string,
    @Body() dto: UpdateAIDto
  ) {
    return this.aisService.update(user.id, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an AI" })
  @ApiParam({ name: "id", description: "AI ID" })
  async delete(
    @CurrentUser() user: CurrentUserData,
    @Param("id") id: string
  ) {
    return this.aisService.delete(user.id, id);
  }
}
