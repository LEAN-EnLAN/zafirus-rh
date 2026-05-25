import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  BlockCaseDto,
  CancelCaseDto,
} from './dto';
import { SubmitCandidateDto } from '../candidate-submissions/dto/submit-candidate.dto';
import { Public } from '../auth/public.decorator';

@Controller('cases')
@ApiTags('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'List onboarding cases' })
  @ApiResponse({ status: 200, description: 'Cases retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  findAll() {
    return this.casesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create onboarding case' })
  @ApiResponse({ status: 201, description: 'Case created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'Related resource not found' })
  create(@Body() dto: CreateCaseDto) {
    return this.casesService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case by id' })
  @ApiResponse({ status: 200, description: 'Case retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid case id' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post(':id/send-form')
  @ApiOperation({ summary: 'Send candidate form' })
  @ApiResponse({ status: 201, description: 'Form sent' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  sendForm(@Param('id') id: string) {
    return this.casesService.sendForm(id);
  }

  @Public()
  @Post(':id/submit-candidate')
  @ApiOperation({ summary: 'Submit candidate data for case' })
  @ApiResponse({ status: 201, description: 'Candidate submitted' })
  @ApiResponse({ status: 400, description: 'Invalid payload or case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  submitCandidate(@Param('id') id: string, @Body() dto: SubmitCandidateDto) {
    return this.casesService.submitCandidate(id, dto);
  }

  @Post(':id/start-review')
  @ApiOperation({ summary: 'Start review stage' })
  @ApiResponse({ status: 201, description: 'Review started' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  startReview(@Param('id') id: string) {
    return this.casesService.startReview(id);
  }

  @Post(':id/consolidate')
  @ApiOperation({ summary: 'Consolidate case' })
  @ApiResponse({ status: 201, description: 'Case consolidated' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  consolidate(@Param('id') id: string) {
    return this.casesService.consolidate(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve case' })
  @ApiResponse({ status: 201, description: 'Case approved' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  approve(@Param('id') id: string) {
    return this.casesService.approve(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate employee from case' })
  @ApiResponse({ status: 201, description: 'Case activated' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  activate(@Param('id') id: string) {
    return this.casesService.activate(id);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block case' })
  @ApiResponse({ status: 201, description: 'Case blocked' })
  @ApiResponse({ status: 400, description: 'Invalid payload or state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  block(@Param('id') id: string, @Body() dto: BlockCaseDto) {
    return this.casesService.block(id, dto);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Unblock case' })
  @ApiResponse({ status: 201, description: 'Case unblocked' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  unblock(@Param('id') id: string) {
    return this.casesService.unblock(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel case' })
  @ApiResponse({ status: 201, description: 'Case canceled' })
  @ApiResponse({ status: 400, description: 'Invalid payload or state' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  cancel(@Param('id') id: string, @Body() dto: CancelCaseDto) {
    return this.casesService.cancel(id, dto);
  }
}
