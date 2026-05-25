import { TestBed } from '@angular/core/testing';
import { OnboardingWorkflowService } from './onboarding-workflow.service';
import { OnboardingStateService } from './onboarding-state.service';
import { OnboardingCrudService } from './onboarding-crud.service';

describe('OnboardingWorkflowService', () => {
  let service: OnboardingWorkflowService;
  let state: OnboardingStateService;
  let caseId: string;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OnboardingWorkflowService, OnboardingStateService, OnboardingCrudService] });
    service = TestBed.inject(OnboardingWorkflowService);
    state = TestBed.inject(OnboardingStateService);
    TestBed.inject(OnboardingCrudService).seedDemo();
    caseId = state.cases()[0].id;
  });

  it('moves sendForm -> submitted -> review -> approve -> activate', () => {
    service.sendCandidateForm(caseId);
    expect(state.cases().find(c => c.id === caseId)?.status).toBe('candidate_invited');

    service.submitCandidateForm(caseId);
    service.startReview(caseId);
    service.approve(caseId);
    service.activate(caseId);

    expect(state.cases().find(c => c.id === caseId)?.status).toBe('active_pending_automation');
  });

  it('requestCorrection returns to candidate_invited', () => {
    service.sendCandidateForm(caseId);
    service.submitCandidateForm(caseId);
    service.startReview(caseId);
    service.requestCorrection(caseId, 'fix');
    const c = state.cases().find(x => x.id === caseId)!;
    expect(c.status).toBe('candidate_invited');
    expect(c.correctionNote).toBe('fix');
  });

  it('toggleAutoRun keeps disabled in workspace mode', () => {
    state.setWorkspaceMode(true);
    service.toggleAutoRun();
    expect(state.wizardMode()).toBeFalse();
  });

  it('can block and unblock case', () => {
    service.block(caseId, 'risk');
    expect(state.cases().find(c => c.id === caseId)?.status).toBe('blocked');
    service.unblock(caseId);
    expect(state.cases().find(c => c.id === caseId)?.status).toBe('hr_review');
  });

  it('cancel moves case to cancelled', () => {
    service.cancel(caseId);
    expect(state.cases().find(c => c.id === caseId)?.status).toBe('cancelled');
  });
});
