import { Injectable, computed, signal } from '@angular/core';
import {
  AuditEvent,
  CandidateData,
  EmailTemplate,
  Employee,
  GroupSuggestion,
  OnboardingCase,
  OnboardingTask,
  TaskType,
  Toast,
  SEED_GROUPS,
  LATAM_COUNTRIES,
} from '../models/onboarding-case.model';

let _idCounter = 0;

export const DEMO_STORAGE_KEY = 'zafirus-demo-state';
export const WORKSPACE_STORAGE_KEY = 'zafirus-workspace-state';

export type WizardCandidateField = 'taxId' | 'cbu' | 'bank' | 'references' | 'files' | null;

export interface EmailTemplatePreset {
  id: string;
  title: string;
  tone: string;
  description: string;
  previewLines: [string, string];
  subject: string;
  bodyHtml: string;
}

export function uid(): string {
  _idCounter += 1;
  return `${Date.now().toString(36)}-${_idCounter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function generateCorporateEmail(first: string, last: string): string {
  const initial = removeAccents(first.charAt(0).toLowerCase());
  const surname = removeAccents(last.split(' ')[0].toLowerCase().replace(/[^a-z]/g, ''));
  return `${initial}${surname}@zafirus.tech`;
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pw = '';
  for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
  return pw;
}

export function makeAudit(
  action: string,
  entityType: string,
  entityId: string,
  actorType: 'user' | 'system' | 'integration' = 'user',
  actorId = 'rrhh',
  details?: Record<string, unknown>,
): AuditEvent {
  return { id: uid(), timestamp: Date.now(), actorType, actorId, action, entityType, entityId, details };
}

export function makeTask(
  type: TaskType,
  owner: 'system' | 'rrhh' | 'candidate' | 'admin' | 'it' = 'system',
  meta?: Record<string, unknown>,
): OnboardingTask {
  return { id: uid(), type, status: 'pending', owner, startedAt: null, completedAt: null, attempts: 0, lastError: null, metadata: meta };
}

export function evaluateGroups(employee: Employee): GroupSuggestion[] {
  const result: GroupSuggestion[] = [];
  const add = (email: string) => {
    const g = SEED_GROUPS.find(sg => sg.email === email);
    if (g) result.push({ ...g, status: 'pending', workspaceGroupId: null });
  };

  add('all@zafirus.tech');
  add(`${employee.team}@zafirus.tech`);
  if (employee.countryId === 'AR') add('argentina@zafirus.tech');
  if (LATAM_COUNTRIES.includes(employee.countryId)) add('latam@zafirus.tech');
  else add('international@zafirus.tech');
  if (employee.contractType === 'contractor') add('contractors@zafirus.tech');

  return [...new Map(result.map(g => [g.email, g])).values()];
}

export function createInitialCandidateData(): CandidateData {
  return {
    taxIdType: '', taxIdValue: '', paymentMethod: '', cbu: '', bankName: '',
    accountNumber: '', swift: '', beneficiaryAddress: '', needsW8: false,
    walletType: '', walletAddress: '', hasQrBinance: false,
    references: [], files: [], currentStep: 1, completedSteps: [], submittedAt: null, consolidated: false,
  };
}

export const DEFAULT_EMAIL_HTML = `<h1 style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">¡BIENVENIDA/O A ZAFIRUS TECHNOLOGIES!</h1>

<p>¡<span class="var-pill" data-variable="firstName" contenteditable="false">Nombre</span>, nos alegra mucho que te sumes al equipo!</p>

<p>Tu fecha de ingreso es el: <span class="var-pill" data-variable="startDateFormatted" contenteditable="false">DD/MM/AAAA</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">💻 Google Workspace</h2>

<p>Nuestra plataforma principal de trabajo es Google Workspace.</p>

<p><strong>Datos de acceso:</strong></p>
<p>📩 Usuario: <span class="var-pill" data-variable="corporateEmail" contenteditable="false">usuario@zafirus.tech</span></p>
<p>🔐 Contraseña temporal: <span class="var-pill" data-variable="temporaryPassword" contenteditable="false">************</span></p>

<p><em>Debés cambiar la contraseña en tu primer login.</em></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">📂 Carpeta de onboarding</h2>

<p>Acceso: <span class="var-pill" data-variable="onboardingFolderUrl" contenteditable="false">https://drive.google.com/drive/folders/onboarding</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">🎨 Kit de Redes</h2>

<p>Kit: <span class="var-pill" data-variable="kitRedesUrl" contenteditable="false">https://drive.google.com/kit-redes</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">🗓️ Agenda</h2>

<p>• <span class="var-pill" data-variable="welcomeMeetingTime" contenteditable="false">DD/MM - HH:mm</span>: Alta con RRHH<br>
👉 <span class="var-pill" data-variable="welcomeMeetingLink" contenteditable="false">meet.google.com/xxxx-xxxx-xxx</span></p>

<p>• <span class="var-pill" data-variable="managerMeetingTime" contenteditable="false">DD/MM - HH:mm</span>: Reunión con <span class="var-pill" data-variable="managerName" contenteditable="false">Nombre y apellido</span><br>
👉 <span class="var-pill" data-variable="managerMeetingLink" contenteditable="false">meet.google.com/xxxx-xxxx-xxx</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">📋 Formulario de onboarding</h2>

<p>Completá tus datos fiscales y bancarios aquí:</p>
<p>👉 <span class="var-pill" data-variable="candidateFormUrl" contenteditable="false">https://zafirustech.com/onboarding/form/...</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<p>¡Te damos la bienvenida! 🙌</p>
<p>Equipo de RRHH · Zafirus Technologies</p>`;

export const EMAIL_TEMPLATE_PRESETS: EmailTemplatePreset[] = [
  {
    id: 'standard',
    title: 'Bienvenida estándar',
    tone: 'Cálida',
    description: 'Plantilla general con variables base, agenda y recursos de arranque.',
    previewLines: [
      'Hola <Nombre>,',
      'Te damos la bienvenida con accesos, agenda y recursos listos para arrancar.',
    ],
    subject: '¡Bienvenida/o a Zafirus Technologies!',
    bodyHtml: DEFAULT_EMAIL_HTML,
  },
  {
    id: 'technical',
    title: 'Bienvenida técnica',
    tone: 'Operativa',
    description: 'Incluye acceso, VPN, herramientas y los pasos técnicos iniciales.',
    previewLines: [
      'Hola <Nombre>,',
      'Tu arranque técnico incluye accesos, VPN, herramientas y links de trabajo.',
    ],
    subject: 'Bienvenida técnica | Zafirus Technologies',
    bodyHtml: `<h1 style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">¡ARRANQUE TÉCNICO LISTO!</h1>

<p>Hola <span class="var-pill" data-variable="firstName" contenteditable="false">Nombre</span>, ya está preparado tu onboarding técnico.</p>

<p>Vas a encontrar accesos, VPN, herramientas y recursos en la siguiente guía para empezar sin fricción.</p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">🔐 Accesos iniciales</h2>

<p>📩 Usuario corporativo: <span class="var-pill" data-variable="corporateEmail" contenteditable="false">usuario@zafirus.tech</span></p>
<p>🔑 Contraseña temporal: <span class="var-pill" data-variable="temporaryPassword" contenteditable="false">************</span></p>

<p>📂 Carpeta de onboarding: <span class="var-pill" data-variable="onboardingFolderUrl" contenteditable="false">https://drive.google.com/drive/folders/onboarding</span></p>
<p>🧰 Kit de redes y utilidades: <span class="var-pill" data-variable="kitRedesUrl" contenteditable="false">https://drive.google.com/kit-redes</span></p>

<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

<h2 style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">🗓️ Coordinación</h2>

<p>• <span class="var-pill" data-variable="welcomeMeetingTime" contenteditable="false">DD/MM - HH:mm</span> — Alta con RRHH<br>
👉 <span class="var-pill" data-variable="welcomeMeetingLink" contenteditable="false">meet.google.com/xxxx-xxxx-xxx</span></p>

<p>• <span class="var-pill" data-variable="managerMeetingTime" contenteditable="false">DD/MM - HH:mm</span> — Reunión con <span class="var-pill" data-variable="managerName" contenteditable="false">Nombre y apellido</span><br>
👉 <span class="var-pill" data-variable="managerMeetingLink" contenteditable="false">meet.google.com/xxxx-xxxx-xxx</span></p>

<p>• Formulario del candidato: <span class="var-pill" data-variable="candidateFormUrl" contenteditable="false">https://zafirustech.com/onboarding/form/...</span></p>

<p>¡Quedamos a disposición para cualquier duda técnica!</p>`,
  },
  {
    id: 'executive',
    title: 'Bienvenida ejecutiva',
    tone: 'Formal',
    description: 'Versión breve y sobria para liderazgos o perfiles de dirección.',
    previewLines: [
      'Estimado/a <Nombre>,',
      'Le compartimos los pasos clave para su incorporación.',
    ],
    subject: 'Bienvenida/o a Zafirus Technologies',
    bodyHtml: `<h1 style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">BIENVENIDA/O A ZAFIRUS TECHNOLOGIES</h1>

<p>Estimado/a <span class="var-pill" data-variable="firstName" contenteditable="false">Nombre</span>:</p>

<p>Le damos la bienvenida a Zafirus Technologies y confirmamos su incorporación para el <span class="var-pill" data-variable="startDateFormatted" contenteditable="false">DD/MM/AAAA</span>.</p>

<p>Compartimos los accesos iniciales y la agenda de arranque para acompañar su primer día.</p>

<p>• Usuario corporativo: <span class="var-pill" data-variable="corporateEmail" contenteditable="false">usuario@zafirus.tech</span></p>
<p>• Contraseña temporal: <span class="var-pill" data-variable="temporaryPassword" contenteditable="false">************</span></p>
<p>• Reunión de bienvenida: <span class="var-pill" data-variable="welcomeMeetingTime" contenteditable="false">DD/MM - HH:mm</span> · <span class="var-pill" data-variable="welcomeMeetingLink" contenteditable="false">meet.google.com/xxxx-xxxx-xxx</span></p>
<p>• Reunión con su responsable: <span class="var-pill" data-variable="managerMeetingTime" contenteditable="false">DD/MM - HH:mm</span> · <span class="var-pill" data-variable="managerName" contenteditable="false">Nombre y apellido</span></p>

<p>Equipo de RRHH · Zafirus Technologies</p>`,
  },
];

export function createEmailTemplate(subject: string, bodyHtml: string, overrides: Partial<EmailTemplate> = {}): EmailTemplate {
  return {
    subject,
    bodyHtml,
    welcomeMeetingTime: '',
    welcomeMeetingLink: '',
    managerMeetingTime: '',
    managerMeetingLink: '',
    onboardingFolderUrl: '',
    kitRedesUrl: '',
    temporaryPassword: generateTemporaryPassword(),
    approvedAt: null,
    sentAt: null,
    scheduledFor: null,
    status: 'draft',
    ...overrides,
  };
}

@Injectable({ providedIn: 'root' })
export class OnboardingStateService {
  readonly emailTemplates = EMAIL_TEMPLATE_PRESETS;

  private readonly _cases = signal<OnboardingCase[]>([]);
  private readonly _selectedCaseId = signal<string | null>(null);
  private readonly _toasts = signal<Toast[]>([]);
  private readonly _candidateViewOpen = signal(false);
  private readonly _sidebarOpen = signal(true);
  private readonly _workspaceMode = signal(true);
  private readonly _wizardMode = signal(false);
  readonly autoExecuteTasks = signal(true);
  readonly autoSendEmail = signal(false);
  readonly wizardActiveTab = signal<string>('overview');
  private readonly _wizardCandidateField = signal<WizardCandidateField>(null);
  private readonly _wizardCandidateStep = signal(0);
  private readonly _candidateResponseCountdown = signal<number | null>(null);
  private readonly _wizardCaseIndex = signal(0);

  readonly cases = this._cases.asReadonly();
  readonly selectedCaseId = this._selectedCaseId.asReadonly();
  readonly toasts = this._toasts.asReadonly();
  readonly candidateViewOpen = this._candidateViewOpen.asReadonly();
  readonly sidebarOpen = this._sidebarOpen.asReadonly();
  readonly workspaceMode = this._workspaceMode.asReadonly();
  readonly wizardMode = this._wizardMode.asReadonly();
  readonly autoRun = this.wizardMode;
  readonly wizardCandidateField = this._wizardCandidateField.asReadonly();
  readonly wizardCandidateStep = this._wizardCandidateStep.asReadonly();
  readonly candidateResponseCountdown = this._candidateResponseCountdown.asReadonly();
  readonly wizardCaseIndex = this._wizardCaseIndex.asReadonly();

  readonly selectedCase = computed(() => {
    const id = this._selectedCaseId();
    return this._cases().find(c => c.id === id) ?? null;
  });

  readonly isDemo = computed(() => !this._workspaceMode());

  readonly demoSummary = computed(() => {
    const selected = this.selectedCase();
    return {
      caseCount: this._cases().length,
      selectedCaseId: this._selectedCaseId(),
      candidateViewOpen: this._candidateViewOpen(),
      sidebarOpen: this._sidebarOpen(),
      selectedCaseStatus: selected?.status ?? null,
      selectedTaskCount: selected?.tasks.length ?? 0,
      selectedFailedTaskCount: selected?.tasks.filter(t => t.status === 'failed').length ?? 0,
      selectedAuditCount: selected?.auditLog.length ?? 0,
    };
  });

  setCases(cases: OnboardingCase[]): void { this._cases.set(cases); }
  updateCases(updater: (cases: OnboardingCase[]) => OnboardingCase[]): void { this._cases.update(updater); }
  setSelectedCaseId(id: string | null): void { this._selectedCaseId.set(id); }
  setToasts(toasts: Toast[]): void { this._toasts.set(toasts); }
  updateToasts(updater: (toasts: Toast[]) => Toast[]): void { this._toasts.update(updater); }
  setCandidateViewOpen(open: boolean): void { this._candidateViewOpen.set(open); }
  setSidebarOpen(open: boolean): void { this._sidebarOpen.set(open); }
  toggleSidebar(): void { this._sidebarOpen.update(open => !open); }
  setWorkspaceMode(val: boolean): void { this._workspaceMode.set(val); }
  setWizardMode(val: boolean): void { this._wizardMode.set(val); }
  setWizardCaseIndex(index: number): void { this._wizardCaseIndex.set(index); }
  setCandidateResponseCountdown(value: number | null): void { this._candidateResponseCountdown.set(value); }
  setWizardCandidateField(value: WizardCandidateField): void { this._wizardCandidateField.set(value); }
  setWizardCandidateStep(value: number): void { this._wizardCandidateStep.set(value); }

  resetState(): void {
    this._cases.set([]);
    this._selectedCaseId.set(null);
    this._wizardCaseIndex.set(0);
    this._toasts.set([]);
    this._candidateViewOpen.set(false);
    this._sidebarOpen.set(true);
    this._wizardMode.set(false);
    this.autoExecuteTasks.set(true);
    this.autoSendEmail.set(false);
    this.wizardActiveTab.set('overview');
    this._wizardCandidateField.set(null);
    this._wizardCandidateStep.set(0);
    this._candidateResponseCountdown.set(null);
    _idCounter = 0;
  }

  addToast(type: Toast['type'], title: string, message?: string): void {
    const id = uid();
    this._toasts.update(ts => [...ts, { id, type, title, message }]);
    setTimeout(() => this.removeToast(id), 5000);
  }

  removeToast(id: string): void {
    this._toasts.update(ts => ts.filter(t => t.id !== id));
  }

  _persistToStorage(storage: Storage = this.isDemo() ? sessionStorage : localStorage, key: string = this.isDemo() ? DEMO_STORAGE_KEY : WORKSPACE_STORAGE_KEY): void {
    try {
      storage.setItem(key, JSON.stringify({
        cases: this._cases(),
        selectedCaseId: this._selectedCaseId(),
        candidateViewOpen: this._candidateViewOpen(),
        sidebarOpen: this._sidebarOpen(),
        autoExecuteTasks: this.autoExecuteTasks(),
        autoRun: this.autoRun(),
        wizardMode: this.wizardMode(),
        wizardCaseIndex: this._wizardCaseIndex(),
        wizardActiveTab: this.wizardActiveTab(),
        _idCounter,
      }));
    } catch (err: unknown) {
      void err;
    }
  }

  _loadStateFromStorage(storage: Storage, key: string): boolean {
    try {
      const raw = storage.getItem(key);
      this.resetState();
      if (!raw) return false;

      const data = JSON.parse(raw) as {
        cases?: OnboardingCase[];
        selectedCaseId?: string | null;
        candidateViewOpen?: boolean;
        sidebarOpen?: boolean;
        wizardMode?: boolean;
        autoRun?: boolean;
        autoExecuteTasks?: boolean;
        wizardCaseIndex?: number;
        wizardActiveTab?: string;
        _idCounter?: number;
      };

      if (Array.isArray(data.cases)) {
        this._cases.set(data.cases.map(item => {
          if (!item.emailTemplate) return item;
          const status = item.emailTemplate.status as EmailTemplate['status'] | 'approved';
          return {
            ...item,
            emailTemplate: {
              ...item.emailTemplate,
              status: status === 'approved' ? 'draft' : status,
            },
          };
        }));
      }

      if (data.selectedCaseId !== undefined) this._selectedCaseId.set(data.selectedCaseId);
      if (data.candidateViewOpen !== undefined) this._candidateViewOpen.set(data.candidateViewOpen);
      if (data.sidebarOpen !== undefined) this._sidebarOpen.set(data.sidebarOpen);
      if (data.wizardMode !== undefined) this._wizardMode.set(data.wizardMode);
      else if (data.autoRun !== undefined) this._wizardMode.set(data.autoRun);
      if (data.autoExecuteTasks !== undefined) this.autoExecuteTasks.set(data.autoExecuteTasks);
      if (data.wizardCaseIndex !== undefined) this._wizardCaseIndex.set(data.wizardCaseIndex);
      if (data.wizardActiveTab !== undefined) this.wizardActiveTab.set(data.wizardActiveTab);
      if (data._idCounter !== undefined) _idCounter = data._idCounter;

      if (this._selectedCaseId() && !this._cases().some(c => c.id === this._selectedCaseId())) {
        this._selectedCaseId.set(null);
      }

      return true;
    } catch (err: unknown) {
      void err;
      return false;
    }
  }
}
