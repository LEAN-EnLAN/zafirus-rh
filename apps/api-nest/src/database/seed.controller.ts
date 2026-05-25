import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { Public } from '../auth/public.decorator';

/**
 * Dev-only endpoint. In production this controller should be disabled
 * or protected behind auth.
 */
@Controller('dev')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Public()
  @Post('seed')
  seed() {
    return this.seedService.run();
  }
}
