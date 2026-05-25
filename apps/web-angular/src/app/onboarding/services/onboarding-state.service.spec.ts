import { TestBed } from '@angular/core/testing';
import { DEMO_STORAGE_KEY, OnboardingStateService } from './onboarding-state.service';

describe('OnboardingStateService', () => {
  let service: OnboardingStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [OnboardingStateService] });
    service = TestBed.inject(OnboardingStateService);
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
  });

  it('updates signals and computed selectedCase', () => {
    service.updateCases(() => [{ id: 'case-1' } as any]);
    service.setSelectedCaseId('case-1');

    expect(service.selectedCaseId()).toBe('case-1');
    expect(service.selectedCase()?.id).toBe('case-1');
  });

  it('persists and loads state from storage', () => {
    service.updateCases(() => [{ id: 'case-2' } as any]);
    service.setSelectedCaseId('case-2');
    service._persistToStorage(sessionStorage, DEMO_STORAGE_KEY);

    const fresh = TestBed.inject(OnboardingStateService);
    fresh._loadStateFromStorage(sessionStorage, DEMO_STORAGE_KEY);

    expect(fresh.cases().length).toBeGreaterThan(0);
    expect(fresh.selectedCaseId()).toBeTruthy();
  });

  it('loadFromStorage ignores malformed payloads', () => {
    sessionStorage.setItem(DEMO_STORAGE_KEY, '{bad-json');

    expect(() => service._loadStateFromStorage(sessionStorage, DEMO_STORAGE_KEY)).not.toThrow();
    expect(service.cases().length).toBe(0);
  });

  it('resets candidate view and sidebar through setters', () => {
    service.setCandidateViewOpen(true);
    service.setSidebarOpen(false);
    service.toggleSidebar();

    expect(service.candidateViewOpen()).toBeTrue();
    expect(service.sidebarOpen()).toBeTrue();
  });
});
