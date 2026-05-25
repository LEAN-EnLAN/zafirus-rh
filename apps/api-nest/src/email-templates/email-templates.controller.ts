import { Controller, Get, Patch, Post, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailTemplatesService } from './email-templates.service';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Controller()
@ApiTags('email-templates')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get('cases/:id/email-template')
  @ApiOperation({ summary: 'Get email template by case id' })
  @ApiResponse({ status: 200, description: 'Email template retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid case id' })
  @ApiResponse({ status: 404, description: 'Email template not found' })
  findByCaseId(@Param('id') caseId: string) {
    return this.service.findByCaseId(caseId);
  }

  @Patch('cases/:id/email-template')
  @ApiOperation({ summary: 'Update email template for a case' })
  @ApiResponse({ status: 201, description: 'Email template updated' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'Case or template not found' })
  update(@Param('id') caseId: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.service.update(caseId, dto);
  }

  @Post('cases/:id/email-template/approve')
  @ApiOperation({ summary: 'Approve email template for a case' })
  @ApiResponse({ status: 201, description: 'Email template approved' })
  @ApiResponse({ status: 400, description: 'Invalid case state' })
  @ApiResponse({ status: 404, description: 'Case or template not found' })
  approve(@Param('id') caseId: string) {
    return this.service.approve(caseId);
  }
}
