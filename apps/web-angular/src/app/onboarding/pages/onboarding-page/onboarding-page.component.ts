import { Component, DestroyRef, effect, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnboardingMockService } from '../../services/onboarding-mock.service';
import { CaseListComponent } from '../../components/case-list/case-list.component';
import { CaseDetailComponent } from '../../components/case-detail/case-detail.component';
import { CandidatePanelComponent } from '../../candidate/candidate-panel/candidate-panel.component';

@Component({
  selector: 'app-onboarding-page',
  standalone: true,
  imports: [CaseListComponent, CaseDetailComponent, CandidatePanelComponent],
  styles: [`
    :host {
      display: block;
      height: 100%;
      min-height: 0;
      width: 100%;
      min-width: 0;
      flex: 1 1 auto;
    }
  `],
  template: `
    <div class="flex h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">
      <!-- RRHH Panel -->
      <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        <!-- Case list sidebar -->
        @if (!svc.selectedCase() || svc.sidebarOpen()) {
          @if (svc.selectedCase()) {
            <div class="hidden h-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)] md:flex md:w-64 lg:w-[260px]">
              <app-case-list />
            </div>
          } @else {
            <div class="flex h-full w-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              <app-case-list />
            </div>
          }
        }

        <!-- Case detail -->
        @if (svc.selectedCase()) {
            <div class="flex h-full min-w-0 w-full flex-1 flex-col overflow-hidden bg-[var(--bg-base)]">
            <app-case-detail [activeTab]="svc.wizardActiveTab()" />
          </div>
        } @else {
          <div class="hidden h-full min-w-0 w-full flex-1 flex-col overflow-hidden bg-[var(--bg-base)] md:flex">
            <app-case-detail [activeTab]="svc.wizardActiveTab()" />
          </div>
        }
      </div>

      <!-- Candidate panel -->
      @if (svc.isDemo() && svc.selectedCase() && svc.candidateViewOpen()) {
        <div class="hidden min-[1180px]:flex min-[1180px]:w-[clamp(360px,30vw,460px)] min-[1180px]:min-w-[360px] min-[1180px]:max-w-[460px] flex-none shrink-0 flex-col bg-[var(--bg-subtle)] min-h-0 min-w-0 overflow-hidden border-l border-[var(--border-subtle)]">
          <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
            <div class="mb-3 flex items-center justify-end">
              <button
                type="button"
                (click)="svc.setCandidateViewOpen(false)"
                aria-label="Cerrar panel del candidato"
                class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
              >
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <app-candidate-panel />
          </div>
        </div>
      }
    </div>
  `,
})
export class OnboardingPageComponent implements OnInit {
  readonly svc = inject(OnboardingMockService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wizardTabSync = effect(() => {
    if (!this.svc.isDemo() || !this.svc.autoRun()) return;

    switch (this.svc.selectedCase()?.status) {
      case 'candidate_invited':
      case 'candidate_submitted':
        this.svc.wizardActiveTab.set('data');
        break;
      case 'hr_review':
      case 'ready_to_activate':
        this.svc.wizardActiveTab.set('overview');
        break;
      case 'active_pending_automation':
        this.svc.wizardActiveTab.set('tasks');
        break;
      default:
        this.svc.wizardActiveTab.set('overview');
        break;
    }
  }, { allowSignalWrites: true });

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
      const mode = data['mode'];
      const isWorkspace = mode !== 'preview';
      this.svc.setWorkspaceMode(isWorkspace);

      if (isWorkspace) {
        this.svc.ensureWorkspaceState();
      } else {
        this.svc.loadFromStorage();
      }
    });

    this.applyDemoFragment(this.route.snapshot.fragment);

    this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(fragment => {
      this.applyDemoFragment(fragment);
    });
  }

  applyDemoFragment(fragment: string | null): void {
    if (!this.svc.isDemo()) return;

    const parsed = this.parseDemoFragment(fragment);

    this.svc.ensureDemoSeeded();

    // If fragment contains candidate=TOKEN, try token-based selection first
    const tokenMatched = parsed.token
      ? this.svc.selectCaseByCandidateToken(parsed.token)
      : parsed.candidateToken
        ? this.svc.selectCaseByCandidateToken(parsed.candidateToken)
        : false;

    const selected = parsed.caseId
      ? this.svc.selectCase(parsed.caseId) || tokenMatched
      : tokenMatched;

    if (!selected) {
      this.svc.selectDefaultCase();
    }

    this.svc.setCandidateViewOpen(parsed.forceCandidateView);
  }

  private parseDemoFragment(fragment: string | null): { caseId: string | null; token: string | null; candidateToken: string | null; forceCandidateView: boolean } {
    const normalized = (fragment ?? '').trim().replace(/^#/, '');
    if (!normalized) {
      return { caseId: null, token: null, candidateToken: null, forceCandidateView: false };
    }

    const result: { caseId: string | null; token: string | null; candidateToken: string | null; forceCandidateView: boolean } = {
      caseId: null,
      token: null,
      candidateToken: null,
      forceCandidateView: false,
    };
    const tokens = normalized.split(/[&;]+/).filter(Boolean);

    for (const token of tokens) {
      const [rawKey, ...rest] = token.split('=');
      const key = rawKey.trim().toLowerCase();
      const value = rest.length > 0 ? decodeURIComponent(rest.join('=').trim()) : null;

      if ((key === 'case' || key === 'caseid' || key === 'id') && value) {
        result.caseId = value;
        continue;
      }

      if (key === 'token' && value) {
        result.token = value;
        continue;
      }

      if (key === 'candidate' && value) {
        result.candidateToken = value;
        result.forceCandidateView = true;
        continue;
      }

      if (!value) {
        if (key === 'candidate' || key === 'candidate-panel' || key === 'demo' || key === 'split') {
          result.forceCandidateView = true;
        }
      }
    }

    return result;
  }
}
