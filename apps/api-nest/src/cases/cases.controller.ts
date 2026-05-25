import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
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
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  findAll() {
    return this.casesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCaseDto) {
    return this.casesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post(':id/send-form')
  sendForm(@Param('id') id: string) {
    return this.casesService.sendForm(id);
  }

  @Public()
  @Post(':id/submit-candidate')
  submitCandidate(
    @Param('id') id: string,
    @Body() dto: SubmitCandidateDto,
  ) {
    return this.casesService.submitCandidate(id, dto);
  }

  @Post(':id/start-review')
  startReview(@Param('id') id: string) {
    return this.casesService.startReview(id);
  }

  @Post(':id/consolidate')
  consolidate(@Param('id') id: string) {
    return this.casesService.consolidate(id);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.casesService.approve(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.casesService.activate(id);
  }

  @Post(':id/block')
  block(@Param('id') id: string, @Body() dto: BlockCaseDto) {
    return this.casesService.block(id, dto);
  }

  @Post(':id/unblock')
  unblock(@Param('id') id: string) {
    return this.casesService.unblock(id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelCaseDto) {
    return this.casesService.cancel(id, dto);
  }
}
