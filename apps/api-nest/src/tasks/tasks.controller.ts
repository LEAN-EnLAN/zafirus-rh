import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@Controller()
@ApiTags('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('cases/:id/tasks')
  @ApiOperation({ summary: 'Get onboarding tasks by case id' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid case id' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  findByCaseId(@Param('id') caseId: string) {
    return this.tasksService.findByCaseId(caseId);
  }
}
