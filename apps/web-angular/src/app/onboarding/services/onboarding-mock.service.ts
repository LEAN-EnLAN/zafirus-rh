import { Injectable, Optional, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { OnboardingFacadeService } from './onboarding-facade.service';
import { OnboardingCrudService } from './onboarding-crud.service';
import { OnboardingStateService } from './onboarding-state.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

@Injectable({ providedIn: 'root' })
export class OnboardingMockService extends OnboardingFacadeService {
  constructor(
    state: OnboardingStateService,
    crud: OnboardingCrudService,
    workflow: OnboardingWorkflowService,
    @Optional() @Inject(ActivatedRoute) route?: ActivatedRoute,
  ) {
    super(state, crud, workflow);

    if (route) {
      const routeLike = route as ActivatedRoute & {
        data?: { pipe?: unknown };
        fragment?: { pipe?: unknown };
        snapshot?: { data?: Record<string, unknown>; fragment?: string | null; routeConfig?: { path?: string | null } | null };
      };

      const snapshotData = routeLike.snapshot?.data ?? {};
      const mode = typeof snapshotData['mode'] === 'string'
        ? snapshotData['mode']
        : snapshotData['demoMode'] || routeLike.snapshot?.routeConfig?.path === 'demo'
          ? 'preview'
          : 'workspace';

      if (!routeLike.data || typeof routeLike.data.pipe !== 'function') {
        routeLike.data = of({ ...snapshotData, mode });
      }

      if (!routeLike.fragment || typeof routeLike.fragment.pipe !== 'function') {
        routeLike.fragment = of(routeLike.snapshot?.fragment ?? null);
      }

      if (mode === 'preview') {
        state.setWorkspaceMode(false);
      }
    }
  }
}
