import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { CasesService } from './cases.service';
import { OnboardingCase } from './onboarding-case.entity';
import { CaseStatus } from '../common/enums';
import { makeCase, makeEmployee, makeSubmission } from '../test-utils/fixtures.factory';
import { EmployeesService } from '../employees/employees.service';
import { AuditService } from '../audit/audit.service';
import { TasksService } from '../tasks/tasks.service';
import { CandidateSubmissionsService } from '../candidate-submissions/candidate-submissions.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';

describe('CasesService', () => {
  const repo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const employeesService = { create: jest.fn(), update: jest.fn() };
  const auditService = { log: jest.fn() };
  const tasksService = { createActivationTasks: jest.fn() };
  const candidateSubmissionsService = { create: jest.fn(), findByCaseId: jest.fn() };
  const emailTemplatesService = { create: jest.fn() };
  let service: CasesService;
  let currentCase: OnboardingCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    currentCase = makeCase();
    repo.findOne.mockImplementation(async () => currentCase);
    repo.create.mockImplementation((x) => x);
    repo.save.mockImplementation(async (x) => { currentCase = { ...currentCase, ...x }; return currentCase; });
    employeesService.create.mockResolvedValue(makeEmployee());

    const module = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(OnboardingCase), useValue: repo },
        { provide: EmployeesService, useValue: employeesService },
        { provide: AuditService, useValue: auditService },
        { provide: TasksService, useValue: tasksService },
        { provide: CandidateSubmissionsService, useValue: candidateSubmissionsService },
        { provide: EmailTemplatesService, useValue: emailTemplatesService },
      ],
    }).compile();
    service = module.get(CasesService);
  });

  it('executes full state machine', async () => {
    const createdCase = makeCase();
    repo.save.mockResolvedValueOnce(createdCase);
    await service.create({ firstName: 'Ana', lastName: 'Pérez', role: 'Eng', area: 'Eng' } as any);
    expect(repo.save).toHaveBeenCalled();

    await service.sendForm(currentCase.id);
    expect(currentCase.status).toBe(CaseStatus.CANDIDATE_INVITED);

    await service.submitCandidate(currentCase.id, { taxIdValue: '20' } as any);
    expect(currentCase.status).toBe(CaseStatus.CANDIDATE_SUBMITTED);
    expect(candidateSubmissionsService.create).toHaveBeenCalled();

    await service.startReview(currentCase.id);
    expect(currentCase.status).toBe(CaseStatus.HR_REVIEW);

    candidateSubmissionsService.findByCaseId.mockResolvedValue(makeSubmission());
    await service.consolidate(currentCase.id);
    expect(employeesService.update).toHaveBeenCalled();

    await service.approve(currentCase.id);
    expect(currentCase.status).toBe(CaseStatus.READY_TO_ACTIVATE);

    await service.activate(currentCase.id);
    expect(currentCase.status).toBe(CaseStatus.ACTIVATING);
    expect(tasksService.createActivationTasks).toHaveBeenCalledWith(currentCase.id);

    await service.block(currentCase.id, { reason: 'x' });
    expect(currentCase.status).toBe(CaseStatus.BLOCKED);
    await service.unblock(currentCase.id);
    expect(currentCase.status).toBe(CaseStatus.HR_REVIEW);
    await service.cancel(currentCase.id, { reason: 'end' });
    expect(currentCase.status).toBe(CaseStatus.CANCELLED);
  });

  it('throws on invalid transition', async () => {
    currentCase.status = CaseStatus.DRAFT;
    await expect(service.startReview(currentCase.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
