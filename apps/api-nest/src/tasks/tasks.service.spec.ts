import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { OnboardingTask } from './onboarding-task.entity';
import { TaskStatus } from '../common/enums';
import { makeTask } from '../test-utils/fixtures.factory';

describe('TasksService', () => {
  const repo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [TasksService, { provide: getRepositoryToken(OnboardingTask), useValue: repo }] }).compile();
    service = module.get(TasksService);
  });

  it('createActivationTasks creates default tasks', async () => {
    repo.create.mockImplementation((x) => x);
    repo.save.mockImplementation(async (x) => x);
    const tasks = await service.createActivationTasks('case-1');
    expect(tasks).toHaveLength(5);
    expect(tasks.every((t) => t.status === TaskStatus.PENDING)).toBe(true);
  });

  it('updateStatus updates timestamps/attempts/output', async () => {
    const task = makeTask();
    repo.findOne.mockResolvedValue(task);
    repo.save.mockImplementation(async (x) => x);

    const running = await service.updateStatus(task.id, TaskStatus.RUNNING);
    expect(running.startedAt).toBeInstanceOf(Date);
    const success = await service.updateStatus(task.id, TaskStatus.SUCCESS, { ok: true });
    expect(success.completedAt).toBeInstanceOf(Date);
    expect(success.output).toEqual({ ok: true });
    const failed = await service.updateStatus(task.id, TaskStatus.FAILED);
    expect(failed.failedAt).toBeInstanceOf(Date);
    expect(failed.attempts).toBe(3);
  });
});
