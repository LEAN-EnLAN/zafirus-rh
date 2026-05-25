import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SeedService } from './seed.service';

/**
 * Dev-only endpoint. In production this controller should be disabled
 * or protected behind auth.
 */
@Controller('dev')
@ApiTags('dev')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('seed')
  @ApiOperation({ summary: 'Seed development data' })
  @ApiResponse({ status: 201, description: 'Seed completed' })
  @ApiResponse({ status: 400, description: 'Invalid seed request' })
  @ApiResponse({ status: 404, description: 'Seed resource not found' })
  seed() {
    return this.seedService.run();
  }
}
