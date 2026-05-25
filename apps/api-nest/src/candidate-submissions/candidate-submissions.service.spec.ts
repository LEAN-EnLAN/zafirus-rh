import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CandidateSubmissionsService } from './candidate-submissions.service';
import { CandidateSubmission } from './candidate-submission.entity';

describe('CandidateSubmissionsService', () => {
  const repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  let service: CandidateSubmissionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [CandidateSubmissionsService, { provide: getRepositoryToken(CandidateSubmission), useValue: repo }] }).compile();
    service = module.get(CandidateSubmissionsService);
  });

  it('create and findByCaseId', async () => {
    repo.create.mockImplementation((x) => x);
    repo.save.mockImplementation(async (x) => x);
    repo.findOne.mockResolvedValue({ id: 'sub-1', caseId: 'case-1' });
    const created = await service.create('case-1', { taxIdValue: 'x' } as any);
    expect(created.caseId).toBe('case-1');
    await expect(service.findByCaseId('case-1')).resolves.toEqual({ id: 'sub-1', caseId: 'case-1' });
  });
});
