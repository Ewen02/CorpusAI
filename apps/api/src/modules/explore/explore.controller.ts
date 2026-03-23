import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ExploreService } from './explore.service';
import { ExploreQueryDto } from './dto/explore-query.dto';

@ApiTags('explore')
@Controller('explore')
export class ExploreController {
  constructor(private readonly exploreService: ExploreService) {}

  @Get('ais')
  @ApiOperation({ summary: 'List public AIs for the marketplace' })
  @ApiResponse({ status: 200, description: 'Paginated list of public AIs' })
  async findPublicAIs(@Query() query: ExploreQueryDto) {
    return this.exploreService.findPublicAIs(query);
  }

  @Get('ais/featured')
  @ApiOperation({ summary: 'Get featured public AIs (top 6 by usage)' })
  @ApiResponse({ status: 200, description: 'List of featured AIs' })
  async findFeaturedAIs() {
    return this.exploreService.findFeaturedAIs();
  }

  @Get('creators/:username')
  @ApiOperation({ summary: 'Get public creator profile with their AIs' })
  @ApiParam({ name: 'username', description: 'Creator username' })
  @ApiResponse({ status: 200, description: 'Creator profile returned' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async findCreatorProfile(@Param('username') username: string) {
    return this.exploreService.findCreatorProfile(username);
  }
}
