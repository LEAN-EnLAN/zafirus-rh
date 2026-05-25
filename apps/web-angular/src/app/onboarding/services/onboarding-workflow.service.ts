import { Injectable, inject } from '@angular/core';
import {
  CandidateData,
  CandidateFile,
  CaseStatus,
  EmailTemplate,
  OnboardingCase,
  OnboardingTask,
  Reference,
  TaskType,
} from '../models/onboarding-case.model';
import { IWorkspaceApi, WORKSPACE_API } from './workspace-api.interface';
import {
  createEmailTemplate,
  generateCorporateEmail,
  generateTemporaryPassword,
  makeAudit,
  makeTask,
  uid,
  OnboardingStateService,
} from './onboarding-state.service';

const DEMO_BEHAVIORS = {
  autoRunTickMs: 6000,
  candidateResponseCountdownSeconds: 8,
} as const;

const NOOP_WORKSPACE_API: IWorkspaceApi = {
  async createGoogleUser() { return { success: true }; },
  async addUserToGroups() { return { success: true }; },
  async configureGmailSignature() { return { success: true }; },
  async sendWelcomeEmail() { return { success: true }; },
  async announceInGroup() { return { success: true }; },
  async requestDevice() { return { success: true }; },
  async provisionWorkspace() { return { success: true }; },
};

@Injectable({ providedIn: 'root' })
export class OnboardingWorkflowService {
  private autoRunIntervalId: ReturnType<typeof setInterval> | null = null;
  private candidateResponseCountdownId: ReturnType<typeof setInterval> | null = null;
  private wizardCycleBusy = false;
  private readonly workspaceApi = inject<IWorkspaceApi | null>(WORKSPACE_API, { optional: true }) ?? NOOP_WORKSPACE_API;

  constructor(private readonly state: OnboardingStateService) {}

  toggleAutoRun(): void {
    if (!this.state.isDemo()) {
      this.state.setWizardMode(false);
      this.stopAutoRun();
      this.clearCandidateResponseCountdown();
      this.state._persistToStorage();
      return;
    }

    if (this.state.wizardMode()) {
      this.state.setWizardMode(false);
      this.stopAutoRun();
      this.clearCandidateResponseCountdown();
      this.state._persistToStorage();
      return;
    }

    this.state.setWizardMode(true);
    this.startAutoRun();
    void this.runAutoRunCycle();
    this.state._persistToStorage();
  }

  startAutoRun(): void {
    if (!this.state.isDemo()) return;
    if (this.autoRunIntervalId !== null) return;
    this.autoRunIntervalId = setInterval(() => void this.runAutoRunCycle(), DEMO_BEHAVIORS.autoRunTickMs);
  }

  stopAutoRun(): void {
    if (this.autoRunIntervalId === null) return;
    clearInterval(this.autoRunIntervalId);
    this.autoRunIntervalId = null;
  }

  clearCandidateResponseCountdown(): void {
    if (this.candidateResponseCountdownId !== null) {
      clearInterval(this.candidateResponseCountdownId);
      this.candidateResponseCountdownId = null;
    }
    this.state.setCandidateResponseCountdown(null);
  }

  sendCandidateForm(caseId: string): void {
    this.transition(caseId, 'draft', 'candidate_invited', 'candidate_form_sent');
    this.state.addToast('info', 'Formulario enviado', 'El candidato puede completar sus datos');
    this.setWizardTab('data');
  }

  submitCandidateForm(caseId: string): void {
    this.clearCandidateResponseCountdown();
    this.state.setWizardCandidateField(null);
    this.state.setWizardCandidateStep(0);
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId && c.status === 'candidate_invited' ? {
        ...c,
        status: 'candidate_submitted' as CaseStatus,
        candidateData: c.candidateData ? { ...c.candidateData, submittedAt: Date.now() } : null,
        auditLog: [...c.auditLog, makeAudit('candidate_form_submitted', 'onboarding_case', caseId, 'user', 'candidate')],
        updatedAt: Date.now(),
      } : c
    )));
    this.state.addToast('success', 'Formulario recibido');
    this.setWizardTab('data');
    this.state._persistToStorage();
  }

  startReview(caseId: string): void {
    this.transition(caseId, 'candidate_submitted', 'hr_review', 'review_started');
    this.setWizardTab('overview');
  }

  requestCorrection(caseId: string, note: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId && c.status === 'hr_review' ? {
        ...c,
        status: 'candidate_invited' as CaseStatus,
        correctionNote: note,
        candidateToken: uid(),
        candidateTokenExpiresAt: Date.now() + 7 * 24 * 3600000,
        candidateData: c.candidateData ? { ...c.candidateData, submittedAt: null } : null,
        auditLog: [...c.auditLog, makeAudit('correction_requested', 'onboarding_case', caseId, 'user', 'rrhh', { note })],
        updatedAt: Date.now(),
      } : c
    )));
    this.state.addToast('warning', 'Corrección solicitada');
    this.state._persistToStorage();
  }

  approve(caseId: string): void {
    this.transition(caseId, 'hr_review', 'ready_to_activate', 'case_approved');
    this.state.addToast('success', 'Caso aprobado', 'Listo para activar');
  }

  activate(caseId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c || c.status !== 'ready_to_activate') return;

    const corporateEmail = c.suggestedEmail || generateCorporateEmail(c.employee.name, c.employee.lastName);
    const tasks: OnboardingTask[] = [
      makeTask('CREATE_GOOGLE_USER', 'system', { email: corporateEmail }),
      makeTask('ADD_GOOGLE_GROUPS', 'system', { groups: c.suggestedGroups.map(g => g.email) }),
      makeTask('CONFIGURE_GMAIL_SIGNATURE', 'system'),
      makeTask('SEND_WELCOME_EMAIL', 'system', { to: [corporateEmail, c.employee.email] }),
    ];
    c.suggestedGroups.forEach(g => tasks.push(makeTask('ANNOUNCE_IN_GROUPS', 'system', { groupEmail: g.email, groupName: g.displayName })));
    tasks.push(makeTask('POST_INTERNAL_ANNOUNCEMENT', 'system'));
    tasks.push(makeTask('REQUEST_DEVICE', 'it'));

    this.state.updateCases(cases => cases.map(x => (
      x.id === caseId ? {
        ...x,
        status: 'active_pending_automation' as CaseStatus,
        employee: { ...x.employee, corporateEmail },
        tasks,
        auditLog: [...x.auditLog, makeAudit('case_activated', 'onboarding_case', caseId)],
        updatedAt: Date.now(),
      } : x
    )));
    this.state.addToast(
      'info',
      'Activación iniciada',
      this.state.autoExecuteTasks() ? 'Ejecutando tareas automáticas…' : 'Las tareas quedarán pendientes para ejecución manual.',
    );
    this.setWizardTab('tasks');
    this.state._persistToStorage();

    if (this.state.autoSendEmail() && c.emailTemplate?.status === 'draft') {
      void this.sendEmail(caseId);
    }

    this.runNextTask(caseId);
  }

  block(caseId: string, reason: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? {
        ...c,
        status: 'blocked' as CaseStatus,
        blockReason: reason,
        auditLog: [...c.auditLog, makeAudit('case_blocked', 'onboarding_case', caseId, 'user', 'rrhh', { reason })],
        updatedAt: Date.now(),
      } : c
    )));
    this.state.addToast('error', 'Caso bloqueado');
    this.state._persistToStorage();
  }

  unblock(caseId: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId && c.status === 'blocked' ? {
        ...c,
        status: 'hr_review' as CaseStatus,
        blockReason: null,
        auditLog: [...c.auditLog, makeAudit('case_unblocked', 'onboarding_case', caseId)],
        updatedAt: Date.now(),
      } : c
    )));
    this.state.addToast('info', 'Caso desbloqueado');
    this.state._persistToStorage();
  }

  cancel(caseId: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? {
        ...c,
        status: 'cancelled' as CaseStatus,
        auditLog: [...c.auditLog, makeAudit('case_cancelled', 'onboarding_case', caseId)],
        updatedAt: Date.now(),
      } : c
    )));
    this.state.addToast('info', 'Caso cancelado');
    this.state._persistToStorage();
  }

  updateCandidateData(caseId: string, data: Partial<CandidateData>): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? {
        ...c,
        candidateData: c.candidateData ? { ...c.candidateData, ...data } : null,
        updatedAt: Date.now(),
      } : c
    )));
    this.state._persistToStorage();
  }

  async simulateFormFill(step = 0): Promise<void> {
    if (!this.state.isDemo() || !this.state.wizardMode()) return;

    const c = this.getWizardCase();
    if (!c || c.status !== 'candidate_invited' || !c.candidateData) return;

    const caseId = c.id;
    const references: Reference[] = [
      {
        id: uid(),
        fullName: 'Carla Benítez',
        relationship: 'Ex manager',
        company: 'Northwind Studio',
        email: 'carla.benitez@northwind.dev',
        phone: '+54 11 5555-0101',
      },
      {
        id: uid(),
        fullName: 'Tomás Medina',
        relationship: 'HR partner',
        company: 'Atlas Retail',
        email: 'tomas.medina@atlas.com',
        phone: '+54 11 5555-0202',
      },
    ];

    const files: CandidateFile[] = [
      { id: uid(), fileType: 'w8', name: 'W-8 BEN firmado.pdf', sizeBytes: 184320 },
      { id: uid(), fileType: 'qr_binance', name: 'Comprobante_Binance.png', sizeBytes: 92342 },
    ];

    const steps = [
      {
        field: 'taxId' as const,
        title: 'Paso 1: CUIL',
        message: 'Completando la identificación fiscal.',
        data: { taxIdType: 'CUIL', taxIdValue: '20-12345678-3', needsW8: false, currentStep: 1, completedSteps: [1] },
      },
      {
        field: 'cbu' as const,
        title: 'Paso 2: CBU',
        message: 'Cargando el CBU y el método de cobro.',
        data: { paymentMethod: 'CBU' as const, cbu: '0000003100000000000000', accountNumber: '000123456789', currentStep: 2, completedSteps: [1, 2] },
      },
      {
        field: 'bank' as const,
        title: 'Paso 3: Banco',
        message: 'Completando banco y datos de transferencia.',
        data: { bankName: 'Banco Galicia', beneficiaryAddress: 'Av. Corrientes 1234, CABA', swift: 'GALISARBA', currentStep: 3, completedSteps: [1, 2, 3] },
      },
      {
        field: 'references' as const,
        title: 'Paso 4: Referencias',
        message: 'Agregando referencias laborales.',
        data: { references, currentStep: 4, completedSteps: [1, 2, 3, 4] },
      },
      {
        field: 'files' as const,
        title: 'Paso 5: Archivos',
        message: 'Adjuntando comprobantes y respaldos.',
        data: { files, hasQrBinance: true, currentStep: 5, completedSteps: [1, 2, 3, 4, 5] },
      },
    ];

    for (let index = step; index < steps.length; index++) {
      const current = steps[index];
      this.state.setWizardCandidateField(current.field);
      this.state.setWizardCandidateStep(index + 1);
      this.state.addToast('info', current.title, current.message);
      this.updateCandidateData(caseId, current.data);
      await this.delay(650);
    }

    this.state.setWizardCandidateField(null);
    this.state.setWizardCandidateStep(steps.length);
  }

  consolidateCandidateData(caseId: string): void {
    this.state.updateCases(cases => cases.map(c => {
      if (c.id !== caseId || !c.candidateData) return c;
      const updatedData = { ...c.candidateData, consolidated: true };
      const tasks = [...c.tasks];
      if (!tasks.find(t => t.type === 'NOTIFY_ADMINISTRATION')) {
        tasks.push(makeTask('NOTIFY_ADMINISTRATION', 'admin'));
      }
      return {
        ...c,
        candidateData: updatedData,
        tasks,
        auditLog: [...c.auditLog, makeAudit('candidate_data_consolidated', 'onboarding_case', caseId)],
        updatedAt: Date.now(),
      };
    }));
    this.state.addToast('success', 'Datos consolidados');
    this.state._persistToStorage();
    const c = this.state.cases().find(x => x.id === caseId);
    if (c?.status === 'active_pending_automation') this.runNextTask(caseId);
  }

  updateEmailTemplate(caseId: string, updates: Partial<EmailTemplate>): void {
    this.state.updateCases(cases => cases.map(c => {
      if (c.id !== caseId || !c.emailTemplate || c.emailTemplate.status === 'sent') return c;
      return {
        ...c,
        emailTemplate: { ...c.emailTemplate, ...updates },
        updatedAt: Date.now(),
      };
    }));
    this.state._persistToStorage();
  }

  applyEmailTemplate(caseId: string, templateId: string): boolean {
    const template = this.state.emailTemplates.find(item => item.id === templateId);
    if (!template) return false;

    let applied = false;
    this.state.updateCases(cases => cases.map(c => {
      if (c.id !== caseId) return c;
      applied = true;
      return {
        ...c,
        emailTemplate: createEmailTemplate(template.subject, template.bodyHtml),
        auditLog: [...c.auditLog, makeAudit('email_template_applied', 'email_template', caseId, 'user', 'rrhh', { templateId: template.id })],
        updatedAt: Date.now(),
      };
    }));

    if (applied) this.state._persistToStorage();
    return applied;
  }

  /** @deprecated Use sendEmail(caseId) instead. */
  approveEmail(caseId: string): void {
    void this.sendEmail(caseId);
  }

  scheduleEmail(caseId: string, scheduledFor: number): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c?.emailTemplate) return;

    if (scheduledFor <= Date.now()) {
      this.state.addToast('error', 'No se puede programar un envío en el pasado.');
      return;
    }

    this.state.updateCases(cases => cases.map(item => (
      item.id === caseId && item.emailTemplate ? {
        ...item,
        emailTemplate: {
          ...item.emailTemplate,
          approvedAt: null,
          scheduledFor,
          sentAt: null,
          status: 'scheduled',
        },
        auditLog: [...item.auditLog, makeAudit('email_scheduled', 'email_template', caseId, 'user', 'rrhh', { scheduledFor })],
        updatedAt: Date.now(),
      } : item
    )));

    this.state.addToast('info', 'Correo programado', `Se enviará el ${this.formatShortDate(scheduledFor)}`);
    this.state._persistToStorage();
  }

  cancelScheduledEmail(caseId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c?.emailTemplate || c.emailTemplate.status !== 'scheduled') return;

    this.state.updateCases(cases => cases.map(item => (
      item.id === caseId && item.emailTemplate ? {
        ...item,
        emailTemplate: {
          ...item.emailTemplate,
          approvedAt: null,
          scheduledFor: null,
          sentAt: null,
          status: 'draft',
        },
        auditLog: [...item.auditLog, makeAudit('email_schedule_cancelled', 'email_template', caseId)],
        updatedAt: Date.now(),
      } : item
    )));

    this.state.addToast('info', 'Programación cancelada');
    this.state._persistToStorage();
  }

  async sendEmail(caseId: string): Promise<boolean> {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c?.emailTemplate) return false;

    try {
      const result = await this.workspaceApi.sendWelcomeEmail(
        c.employee.email,
        c.emailTemplate.subject,
        c.emailTemplate.bodyHtml,
      );

      if (!result.success) {
        this.state.addToast('error', 'No se pudo enviar el correo', result.error || 'La API devolvió un error');
        return false;
      }

      const sentAt = Date.now();
      const wasSent = !!c.emailTemplate.sentAt;
      const messageId = result && typeof result['messageId'] === 'string' ? (result['messageId'] as string) : null;

      this.state.updateCases(cases => cases.map(item => (
        item.id === caseId && item.emailTemplate ? {
          ...item,
          emailTemplate: {
            ...item.emailTemplate,
            approvedAt: null,
            sentAt,
            scheduledFor: null,
            status: 'sent',
          },
          auditLog: [...item.auditLog, makeAudit('email_sent', 'email_template', caseId, 'integration', 'workspace', { messageId })],
          updatedAt: sentAt,
        } : item
      )));

      this.state.addToast('success', wasSent ? `Correo reenviado a ${c.employee.name} ${c.employee.lastName}` : `Correo enviado a ${c.employee.name} ${c.employee.lastName}`);
      console.debug('[OnboardingWorkflowService] sendEmail success', { caseId, result });
      this.state._persistToStorage();
      return true;
    } catch (error: unknown) {
      console.debug('[OnboardingWorkflowService] sendEmail error', { caseId, error });
      this.state.addToast('error', 'No se pudo enviar el correo');
      return false;
    }
  }

  retryTask(caseId: string, taskId: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? {
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: 'pending' as const, lastError: null } : t),
      } : c
    )));
    this.runTask(caseId, taskId);
  }

  executeTask(caseId: string, taskId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c) return;

    const task = c.tasks.find(t => t.id === taskId);
    if (!task || task.status !== 'pending') return;

    this.runTask(caseId, taskId);
  }

  executeAllPending(caseId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c) return;

    c.tasks.filter(t => t.status === 'pending').forEach(task => this.runTask(caseId, task.id));
  }

  skipTask(caseId: string, taskId: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? {
        ...c,
        tasks: c.tasks.map(t => t.id === taskId ? { ...t, status: 'skipped' as const, completedAt: Date.now() } : t),
        auditLog: [...c.auditLog, makeAudit('task_skipped', 'onboarding_task', taskId)],
        updatedAt: Date.now(),
      } : c
    )));
    this.checkOperative(caseId);
  }

  addToast(type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string): void {
    this.state.addToast(type, title, message);
  }

  removeToast(id: string): void {
    this.state.removeToast(id);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getWizardCase(): OnboardingCase | null {
    return this.state.cases()[this.state.wizardCaseIndex()] ?? null;
  }

  private advanceWizardCaseIndex(): void {
    this.state.setWizardCaseIndex(this.state.wizardCaseIndex() + 1);

    const nextCase = this.state.cases()[this.state.wizardCaseIndex()] ?? null;
    if (nextCase) {
      this.state.setSelectedCaseId(nextCase.id);
    } else {
      this.state.setWizardMode(false);
      this.stopAutoRun();
    }

    this.state._persistToStorage();
  }

  private setWizardTab(tab: string): void {
    if (!this.state.wizardMode()) return;
    this.state.wizardActiveTab.set(tab);
  }

  private startCandidateResponseCountdown(caseId: string): void {
    if (!this.state.wizardMode() || this.candidateResponseCountdownId !== null) return;

    let remaining = DEMO_BEHAVIORS.candidateResponseCountdownSeconds;
    this.state.setCandidateResponseCountdown(remaining);
    this.state.addToast('info', 'Esperando respuesta del candidato...', `Se enviará automáticamente en ${remaining} segundos.`);

    this.candidateResponseCountdownId = setInterval(() => {
      const c = this.state.cases().find(x => x.id === caseId);
      if (!c || c.status !== 'candidate_invited' || !this.state.wizardMode()) {
        this.clearCandidateResponseCountdown();
        return;
      }

      remaining -= 1;
      if (remaining <= 0) {
        this.clearCandidateResponseCountdown();
        this.submitCandidateForm(caseId);
        return;
      }

      this.state.setCandidateResponseCountdown(remaining);
    }, 1000);
  }

  private formatShortDate(timestamp: number): string {
    return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' }).format(new Date(timestamp));
  }

  private taskProgressMessage(taskType: TaskType): string {
    switch (taskType) {
      case 'CREATE_GOOGLE_USER': return 'Creando usuario Google...';
      case 'ADD_GOOGLE_GROUPS': return 'Agregando a grupos...';
      case 'CONFIGURE_GMAIL_SIGNATURE': return 'Configurando firma de Gmail...';
      case 'SEND_WELCOME_EMAIL': return 'Enviando correo de bienvenida...';
      case 'ANNOUNCE_IN_GROUPS': return 'Anunciando en grupos...';
      case 'POST_INTERNAL_ANNOUNCEMENT': return 'Publicando anuncio interno...';
      case 'REQUEST_DEVICE': return 'Solicitando dispositivo...';
      case 'NOTIFY_ADMINISTRATION': return 'Notificando a Administración...';
      default: return 'Ejecutando tarea...';
    }
  }

  private statusToWizardTab(status: CaseStatus): string | null {
    switch (status) {
      case 'candidate_invited': return 'data';
      case 'candidate_submitted': return 'data';
      case 'hr_review': return 'overview';
      case 'ready_to_activate': return 'overview';
      case 'active_pending_automation': return 'tasks';
      default: return null;
    }
  }

  private transition(caseId: string, from: CaseStatus, to: CaseStatus, action: string): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId && c.status === from ? {
        ...c,
        status: to,
        auditLog: [...c.auditLog, makeAudit(action, 'onboarding_case', caseId)],
        updatedAt: Date.now(),
      } : c
    )));
    const wizardTab = this.statusToWizardTab(to);
    if (wizardTab) this.setWizardTab(wizardTab);
    this.state._persistToStorage();
  }

  private runNextTask(caseId: string): void {
    if (!this.state.autoExecuteTasks()) return;

    const c = this.state.cases().find(x => x.id === caseId);
    if (!c) return;

    const seq: TaskType[] = ['CREATE_GOOGLE_USER', 'ADD_GOOGLE_GROUPS', 'CONFIGURE_GMAIL_SIGNATURE', 'SEND_WELCOME_EMAIL'];
    const par: TaskType[] = ['ANNOUNCE_IN_GROUPS', 'POST_INTERNAL_ANNOUNCEMENT', 'REQUEST_DEVICE', 'NOTIFY_ADMINISTRATION'];

    const nextSeq = c.tasks.find(t => seq.includes(t.type) && t.status === 'pending');
    if (nextSeq) { this.runTask(caseId, nextSeq.id); return; }
    if (c.tasks.some(t => seq.includes(t.type) && t.status === 'running')) return;

    c.tasks.filter(t => par.includes(t.type) && t.status === 'pending').forEach(t => this.runTask(caseId, t.id));
  }

  private runTask(caseId: string, taskId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c) return;
    const task = c.tasks.find(t => t.id === taskId);
    if (!task || task.status === 'running' || task.status === 'success') return;

    this.state.updateCases(cases => cases.map(x => (
      x.id === caseId ? {
        ...x,
        tasks: x.tasks.map(t => (
          t.id === taskId ? { ...t, status: 'running' as const, startedAt: Date.now(), attempts: t.attempts + 1 } : t
        )),
        updatedAt: Date.now(),
      } : x
    )));

    this.state._persistToStorage();
    void this.fireWorkspaceApi(task.type, c);

    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      const success = Math.random() > 0.05;
      this.state.updateCases(cases => cases.map(x => (
        x.id === caseId ? {
          ...x,
          tasks: x.tasks.map(t => (
            t.id === taskId ? {
              ...t,
              status: success ? 'success' : 'failed',
              completedAt: Date.now(),
              lastError: success ? null : 'Error de conexión con el servicio externo. Reintentá manualmente.',
            } : t
          )),
          suggestedGroups: task.type === 'ADD_GOOGLE_GROUPS' && success
            ? x.suggestedGroups.map(g => ({ ...g, status: 'added' as const }))
            : x.suggestedGroups,
          auditLog: [...x.auditLog, makeAudit(success ? 'task_completed' : 'task_failed', 'onboarding_task', taskId, 'system', 'automation', { taskType: task.type })],
          updatedAt: Date.now(),
        } : x
      )));

      this.state._persistToStorage();
      if (success) this.checkOperative(caseId);
    }, delay);
  }

  private async fireWorkspaceApi(taskType: TaskType, c: OnboardingCase): Promise<void> {
    try {
      const employee = c.employee;
      const corporateEmail = c.suggestedEmail ?? generateCorporateEmail(employee.name, employee.lastName);
      const password = c.emailTemplate?.temporaryPassword ?? generateTemporaryPassword();
      const groupEmail = c.suggestedGroups[0]?.email ?? 'all@zafirus.tech';
      const message = `Nuevo onboarding: ${employee.name} ${employee.lastName}`;

      let result: Record<string, unknown> | null = null;

      switch (taskType) {
        case 'CREATE_GOOGLE_USER':
          result = await this.workspaceApi.createGoogleUser(corporateEmail, password, employee.name, employee.lastName);
          break;
        case 'ADD_GOOGLE_GROUPS':
          result = await this.workspaceApi.addUserToGroups(employee.guid, c.suggestedGroups.map(group => group.email));
          break;
        case 'CONFIGURE_GMAIL_SIGNATURE':
          result = await this.workspaceApi.configureGmailSignature(employee.guid, `${employee.name} ${employee.lastName}\n${employee.role}`);
          break;
        case 'SEND_WELCOME_EMAIL':
          result = await this.workspaceApi.sendWelcomeEmail(
            employee.email,
            c.emailTemplate?.subject ?? 'Bienvenida/o a Zafirus Technologies',
            c.emailTemplate?.bodyHtml ?? '',
          );
          break;
        case 'ANNOUNCE_IN_GROUPS':
        case 'POST_INTERNAL_ANNOUNCEMENT':
          result = await this.workspaceApi.announceInGroup(groupEmail, message);
          break;
        case 'REQUEST_DEVICE':
          result = await this.workspaceApi.requestDevice(employee.guid, employee.contractType === 'contractor' ? 'contractor-kit' : 'laptop');
          break;
        case 'NOTIFY_ADMINISTRATION':
          result = await this.workspaceApi.provisionWorkspace(employee.guid);
          break;
        default:
          return;
      }

      console.debug('[OnboardingWorkflowService] workspace api result', { caseId: c.id, taskType, result });
    } catch (error: unknown) {
      console.debug('[OnboardingWorkflowService] workspace api error', { caseId: c.id, taskType, error });
    }
  }

  private checkOperative(caseId: string): void {
    const c = this.state.cases().find(x => x.id === caseId);
    if (!c || c.status !== 'active_pending_automation') return;
    if (c.tasks.every(t => t.status === 'success' || t.status === 'skipped')) {
      this.state.updateCases(cases => cases.map(x => (
        x.id === caseId ? {
          ...x,
          status: 'operative' as CaseStatus,
          employee: { ...x.employee, status: 'active' as const },
          auditLog: [...x.auditLog, makeAudit('case_operative', 'onboarding_case', caseId, 'system', 'automation')],
          updatedAt: Date.now(),
        } : x
      )));
      if (this.state.wizardMode() && this.state.isDemo() && this.state.cases()[this.state.wizardCaseIndex()]?.id === caseId) {
        this.advanceWizardCaseIndex();
      }
      this.state.addToast('success', '¡Alta completada!', `${c.employee.name} ${c.employee.lastName} está operativo`);
      this.state._persistToStorage();
    } else {
      this.runNextTask(caseId);
    }
  }

  private async runAutoRunCycle(): Promise<void> {
    if (!this.state.wizardMode() || !this.state.isDemo()) {
      this.stopAutoRun();
      return;
    }

    if (this.wizardCycleBusy) return;
    this.wizardCycleBusy = true;

    try {
      const c = this.getWizardCase();
      if (!c) {
        this.state.setWizardMode(false);
        this.stopAutoRun();
        return;
      }

      if (c.status === 'operative') {
        this.advanceWizardCaseIndex();
        return;
      }

      if (c.status === 'cancelled' || c.status === 'blocked') return;

      if (c.status === 'draft') {
        this.state.addToast('info', 'Paso 1: Enviando formulario', 'Abriendo el flujo guiado.');
        await this.delay(2000);
        this.sendCandidateForm(c.id);
        return;
      }

      if (c.status === 'candidate_invited') {
        if (this.state.candidateResponseCountdown() !== null) return;
        this.setWizardTab('data');
        await this.simulateFormFill(this.state.wizardCandidateStep());
        this.startCandidateResponseCountdown(c.id);
        return;
      }

      if (c.status === 'candidate_submitted') {
        this.state.addToast('info', 'Paso 3: Revisando datos', 'Derivando el caso a RRHH.');
        await this.delay(2000);
        this.startReview(c.id);
        return;
      }

      if (c.status === 'hr_review') {
        this.state.addToast('info', 'Revisando datos del candidato...', 'Validando la información antes de aprobar.');
        await this.delay(c.candidateData?.consolidated ? 3500 : 2000);
        if (c.candidateData && !c.candidateData.consolidated) {
          this.consolidateCandidateData(c.id);
          return;
        }

        this.state.addToast('info', 'Paso 4: Aprobando alta', 'Liberando la activación automática.');
        await this.delay(1500);
        this.approve(c.id);
        const updated = this.state.cases().find(x => x.id === c.id);
        if (updated?.status === 'ready_to_activate') {
          await this.delay(1000);
          this.activate(c.id);
        }
        return;
      }

      if (c.status === 'ready_to_activate') {
        this.state.addToast('info', 'Paso 5: Activando alta', 'Iniciando automatización.');
        await this.delay(2000);
        this.activate(c.id);
        return;
      }

      if (c.status !== 'active_pending_automation') return;

      if (!this.state.autoExecuteTasks()) return;

      const failedTasks = c.tasks.filter(t => t.status === 'failed');
      if (failedTasks.length > 0) {
        failedTasks.forEach(t => this.retryTask(c.id, t.id));
        return;
      }

      const nextTask = c.tasks.find(t => t.status === 'pending');
      if (nextTask) {
        const taskIndex = c.tasks.findIndex(t => t.id === nextTask.id) + 1;
        this.state.addToast('info', `Tarea ${taskIndex}/${c.tasks.length}: ${this.taskProgressMessage(nextTask.type)}`);
      }

      this.runNextTask(c.id);
    } finally {
      this.wizardCycleBusy = false;
    }
  }
}
