import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CandidateSubmissionsService } from './candidate-submissions.service';
import { SubmitCandidateDto } from './dto/submit-candidate.dto';
import { Public } from '../auth/public.decorator';

@Controller()
@ApiTags('candidate-submissions')
export class CandidateSubmissionsController {
  constructor(private readonly service: CandidateSubmissionsService) {}

  @Get('cases/:id/candidate-submission')
  @ApiOperation({ summary: 'Get candidate submission by case id' })
  @ApiResponse({ status: 200, description: 'Candidate submission retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid case id' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  findByCaseId(@Param('id') caseId: string) {
    return this.service.findByCaseId(caseId);
  }

  @Public()
  @Post('cases/:id/candidate-submission')
  @ApiOperation({ summary: 'Create candidate submission for a case' })
  @ApiResponse({ status: 201, description: 'Candidate submission created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  create(@Param('id') caseId: string, @Body() dto: SubmitCandidateDto) {
    // Note: The cases controller also exposes POST /cases/:id/submit-candidate
    // which calls this service and also transitions the case status.
    return this.service.create(caseId, dto);
  }
}
