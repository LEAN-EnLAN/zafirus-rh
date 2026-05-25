import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CandidateSubmissionsService } from './candidate-submissions.service';
import { SubmitCandidateDto } from './dto/submit-candidate.dto';
import { Public } from '../auth/public.decorator';

@Controller()
export class CandidateSubmissionsController {
  constructor(private readonly service: CandidateSubmissionsService) {}

  @Get('cases/:id/candidate-submission')
  findByCaseId(@Param('id') caseId: string) {
    return this.service.findByCaseId(caseId);
  }

  @Public()
  @Post('cases/:id/candidate-submission')
  create(@Param('id') caseId: string, @Body() dto: SubmitCandidateDto) {
    // Note: The cases controller also exposes POST /cases/:id/submit-candidate
    // which calls this service and also transitions the case status.
    return this.service.create(caseId, dto);
  }
}
