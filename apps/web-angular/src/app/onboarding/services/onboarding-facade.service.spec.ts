import { TestBed } from '@angular/core/testing';
import { OnboardingFacadeService } from './onboarding-facade.service';
import { OnboardingCrudService } from './onboarding-crud.service';
import { OnboardingStateService } from './onboarding-state.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

describe('OnboardingFacadeService', () => {
  let facade: OnboardingFacadeService;
  let crud: OnboardingCrudService;
  let workflow: OnboardingWorkflowService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OnboardingFacadeService, OnboardingCrudService, OnboardingStateService, OnboardingWorkflowService] });
    facade = TestBed.inject(OnboardingFacadeService);
    crud = TestBed.inject(OnboardingCrudService);
    workflow = TestBed.inject(OnboardingWorkflowService);
  });

  it('delegates crud selectCase', () => {
    spyOn(crud, 'selectCase').and.returnValue(true);
    expect(facade.selectCase('1')).toBeTrue();
    expect(crud.selectCase).toHaveBeenCalledWith('1');
  });

  it('delegates workflow approve', () => {
    spyOn(workflow, 'approve');
    facade.approve('x');
    expect(workflow.approve).toHaveBeenCalledWith('x');
  });

  it('exposes state signals', () => {
    expect(typeof facade.cases).toBe('function');
    expect(typeof facade.selectedCaseId).toBe('function');
  });
});
