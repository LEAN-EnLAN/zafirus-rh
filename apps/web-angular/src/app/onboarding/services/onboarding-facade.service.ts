import { Injectable } from '@angular/core';
import { CandidateData, CreateCaseData, EmailTemplate, Employee, OnboardingCase, Toast } from '../models/onboarding-case.model';
import { OnboardingCrudService } from './onboarding-crud.service';
import { OnboardingStateService } from './onboarding-state.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

@Injectable({ providedIn: 'root' })
export class OnboardingFacadeService {
  get emailTemplates() { return this.state.emailTemplates; }
  get cases() { return this.state.cases; }
  get selectedCaseId() { return this.state.selectedCaseId; }
  get toasts() { return this.state.toasts; }
  get candidateViewOpen() { return this.state.candidateViewOpen; }
  get sidebarOpen() { return this.state.sidebarOpen; }
  get workspaceMode() { return this.state.workspaceMode; }
  get wizardMode() { return this.state.wizardMode; }
  get autoRun() { return this.state.autoRun; }
  get autoExecuteTasks() { return this.state.autoExecuteTasks; }
  get autoSendEmail() { return this.state.autoSendEmail; }
  get wizardActiveTab() { return this.state.wizardActiveTab; }
  get wizardCandidateField() { return this.state.wizardCandidateField; }
  get wizardCandidateStep() { return this.state.wizardCandidateStep; }
  get candidateResponseCountdown() { return this.state.candidateResponseCountdown; }
  get wizardCaseIndex() { return this.state.wizardCaseIndex; }
  get selectedCase() { return this.state.selectedCase; }
  get isDemo() { return this.state.isDemo; }
  get demoSummary() { return this.state.demoSummary; }

  constructor(
    protected readonly state: OnboardingStateService,
    protected readonly crud: OnboardingCrudService,
    protected readonly workflow: OnboardingWorkflowService,
  ) {}

  selectCase(id: string | null): boolean { return this.crud.selectCase(id); }
  selectDefaultCase(): boolean { return this.crud.selectDefaultCase(); }
  selectCaseByCandidateToken(token: string): boolean { return this.crud.selectCaseByCandidateToken(token); }
  setCandidateViewOpen(open: boolean): void { this.crud.setCandidateViewOpen(open); }
  setSidebarOpen(open: boolean): void { this.crud.setSidebarOpen(open); }
  toggleSidebar(): void { this.crud.toggleSidebar(); }
  setWorkspaceMode(val: boolean): void { this.crud.setWorkspaceMode(val); }
  loadFromStorage(): void { this.crud.loadFromStorage(); }
  toggleAutoRun(): void { this.workflow.toggleAutoRun(); }
  ensureDemoSeeded(): void { this.crud.ensureDemoSeeded(); }
  ensureWorkspaceState(): void { this.crud.ensureWorkspaceState(); }
  resetDemo(): void { this.crud.resetDemo(); }
  resetToSeed(): void { this.crud.resetToSeed(); }
  createCase(data: CreateCaseData): OnboardingCase { return this.crud.createCase(data); }
  updateCase(caseId: string, updates: Partial<OnboardingCase>): void { this.crud.updateCase(caseId, updates); }
  deleteCase(caseId: string): void { this.crud.deleteCase(caseId); }
  updateEmployee(caseId: string, updates: Partial<Employee>): void { this.crud.updateEmployee(caseId, updates); }
  sendCandidateForm(caseId: string): void { this.workflow.sendCandidateForm(caseId); }
  submitCandidateForm(caseId: string): void { this.workflow.submitCandidateForm(caseId); }
  startReview(caseId: string): void { this.workflow.startReview(caseId); }
  requestCorrection(caseId: string, note: string): void { this.workflow.requestCorrection(caseId, note); }
  approve(caseId: string): void { this.workflow.approve(caseId); }
  activate(caseId: string): void { this.workflow.activate(caseId); }
  block(caseId: string, reason: string): void { this.workflow.block(caseId, reason); }
  unblock(caseId: string): void { this.workflow.unblock(caseId); }
  cancel(caseId: string): void { this.workflow.cancel(caseId); }
  updateCandidateData(caseId: string, data: Partial<CandidateData>): void { this.workflow.updateCandidateData(caseId, data); }
  simulateFormFill(step = 0): Promise<void> { return this.workflow.simulateFormFill(step); }
  consolidateCandidateData(caseId: string): void { this.workflow.consolidateCandidateData(caseId); }
  updateEmailTemplate(caseId: string, updates: Partial<EmailTemplate>): void { this.workflow.updateEmailTemplate(caseId, updates); }
  applyEmailTemplate(caseId: string, templateId: string): boolean { return this.workflow.applyEmailTemplate(caseId, templateId); }
  approveEmail(caseId: string): void { this.workflow.approveEmail(caseId); }
  scheduleEmail(caseId: string, scheduledFor: number): void { this.workflow.scheduleEmail(caseId, scheduledFor); }
  cancelScheduledEmail(caseId: string): void { this.workflow.cancelScheduledEmail(caseId); }
  sendEmail(caseId: string): Promise<boolean> { return this.workflow.sendEmail(caseId); }
  retryTask(caseId: string, taskId: string): void { this.workflow.retryTask(caseId, taskId); }
  executeTask(caseId: string, taskId: string): void { this.workflow.executeTask(caseId, taskId); }
  executeAllPending(caseId: string): void { this.workflow.executeAllPending(caseId); }
  skipTask(caseId: string, taskId: string): void { this.workflow.skipTask(caseId, taskId); }
  addToast(type: Toast['type'], title: string, message?: string): void { this.state.addToast(type, title, message); }
  removeToast(id: string): void { this.state.removeToast(id); }
  seedDemo(): void { this.crud.seedDemo(); }
}
