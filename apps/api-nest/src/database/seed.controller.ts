import { Controller, Post, Query } from '@nestjs/common';
import { SeedService } from './seed.service';

/**
 * Dev-only endpoint. In production this controller should be disabled
 * or protected behind auth.
 */
@Controller('dev')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('seed')
  seed(@Query('full') full?: string) {
    return this.seedService.run(full === 'true');
  }
}
