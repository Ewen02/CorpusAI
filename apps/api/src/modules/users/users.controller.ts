import { Controller, Get, Patch, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { AuthGuard, CurrentUser, type CurrentUserData } from "../auth";
import { UpdateProfileDto } from "./dto/update-profile.dto";

@ApiTags("users")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get current user profile" })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getProfile(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update current user profile" })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get("me/stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  async getStats(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getDashboardStats(user.id);
  }

  @Get("me/accounts")
  @ApiOperation({ summary: "Get user's connected accounts (OAuth providers)" })
  async getAccounts(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getAccounts(user.id);
  }

  @Get("me/analytics")
  @ApiOperation({ summary: "Get analytics data with trends" })
  @ApiQuery({ name: "period", required: false, enum: ["7d", "30d", "90d"] })
  async getAnalytics(
    @CurrentUser() user: CurrentUserData,
    @Query("period") period?: "7d" | "30d" | "90d"
  ) {
    return this.usersService.getAnalytics(user.id, period || "30d");
  }
}
