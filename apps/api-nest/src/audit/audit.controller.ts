import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';

@Controller()
@ApiTags('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('cases/:id/audit')
  @ApiOperation({ summary: 'Get audit events by case id' })
  @ApiResponse({ status: 200, description: 'Audit events retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid case id' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  findByCaseId(@Param('id') caseId: string) {
    return this.auditService.findByCaseId(caseId);
  }
}
