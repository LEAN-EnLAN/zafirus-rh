import { Injectable } from '@angular/core';
import {
  CandidateData,
  CaseStatus,
  CreateCaseData,
  EmailTemplate,
  Employee,
  GroupSuggestion,
  OnboardingCase,
  OnboardingTask,
  TaskType,
} from '../models/onboarding-case.model';
import { formatCuit, isFutureDate, isPastDate, isValidEmail, validateCuit } from '../../shared/utils/cuit-validator';
import {
  DEFAULT_EMAIL_HTML,
  DEMO_STORAGE_KEY,
  WORKSPACE_STORAGE_KEY,
  createEmailTemplate,
  createInitialCandidateData,
  evaluateGroups,
  generateCorporateEmail,
  generateTemporaryPassword,
  makeAudit,
  makeTask,
  uid,
  OnboardingStateService,
} from './onboarding-state.service';
import { OnboardingWorkflowService } from './onboarding-workflow.service';

@Injectable({ providedIn: 'root' })
export class OnboardingCrudService {
  constructor(
    private readonly state: OnboardingStateService,
    private readonly workflow: OnboardingWorkflowService,
  ) {}

  selectCase(id: string | null): boolean {
    if (id === null) {
      this.state.setSelectedCaseId(null);
      this.state._persistToStorage();
      return true;
    }

    if (!this.state.cases().some(c => c.id === id)) return false;

    this.state.setSelectedCaseId(id);
    this.state._persistToStorage();
    return true;
  }

  selectDefaultCase(): boolean {
    const first = this.state.cases()[0];
    if (!first) return false;
    this.state.setSelectedCaseId(first.id);
    this.state._persistToStorage();
    return true;
  }

  selectCaseByCandidateToken(token: string): boolean {
    if (!this.state.isDemo()) return false;

    const match = this.state.cases().find(c => c.candidateToken === token);
    if (!match) return false;
    this.state.setSelectedCaseId(match.id);
    this.state._persistToStorage();
    return true;
  }

  setCandidateViewOpen(open: boolean): void {
    if (!this.state.isDemo()) {
      this.state.setCandidateViewOpen(false);
      this.state._persistToStorage();
      return;
    }

    this.state.setCandidateViewOpen(open);
    this.state._persistToStorage();
  }

  setSidebarOpen(open: boolean): void {
    this.state.setSidebarOpen(open);
    this.state._persistToStorage();
  }

  toggleSidebar(): void {
    this.state.toggleSidebar();
    this.state._persistToStorage();
  }

  setWorkspaceMode(val: boolean): void {
    this.state.setWorkspaceMode(val);
    if (val) {
      this.ensureWorkspaceState();
      return;
    }

    this.loadFromStorage();
  }

  loadFromStorage(): void {
    if (!this.state.isDemo()) return;

    this.state._loadStateFromStorage(sessionStorage, DEMO_STORAGE_KEY);
    if (this.state.cases().length === 0) {
      this.seedDemo();
    }

    if (this.state.autoRun()) this.workflow.startAutoRun();
  }

  ensureDemoSeeded(): void {
    if (this.state.cases().length === 0) this.seedDemo();
  }

  ensureWorkspaceState(): void {
    if (this.state.isDemo()) return;

    this.workflow.stopAutoRun();
    this.workflow.clearCandidateResponseCountdown();
    this.state.resetState();
    this.state._persistToStorage(localStorage, WORKSPACE_STORAGE_KEY);
  }

  resetDemo(): void {
    this.resetToSeed();
  }

  resetToSeed(): void {
    try {
      sessionStorage.removeItem(DEMO_STORAGE_KEY);
    } catch (err: unknown) {
      void err;
    }

    this.workflow.stopAutoRun();
    this.workflow.clearCandidateResponseCountdown();
    this.state.resetState();
    this.seedDemo();
  }

  validateCreateCaseData(data: CreateCaseData): string | null {
    if (!data.firstName.trim()) return 'Completá el nombre.';
    if (!data.lastName.trim()) return 'Completá el apellido.';
    if (!isValidEmail(data.personalEmail)) return 'Ingresá un correo personal válido.';

    const cuitValidation = validateCuit(data.CI);
    if (!cuitValidation.valid) return cuitValidation.error ?? 'El CUIT no es válido.';

    if (!data.birthday) return 'Completá la fecha de nacimiento.';
    if (isFutureDate(data.birthday)) return 'La fecha de nacimiento no puede ser futura.';

    if (!data.countryId.trim()) return 'Completá el país.';
    if (!data.provinceId.trim()) return 'Completá la provincia.';
    if (!data.cityId.trim()) return 'Completá la ciudad.';
    if (!data.role.trim()) return 'Completá el puesto.';
    if (!data.team) return 'Completá el equipo.';
    if (!data.contractType) return 'Completá el tipo de contrato.';
    if (!data.managerName.trim()) return 'Completá el responsable directo.';
    if (!data.startDate) return 'Completá la fecha de ingreso.';
    if (isPastDate(data.startDate)) return 'La fecha de ingreso no puede ser pasada.';

    return null;
  }

  createCase(data: CreateCaseData): OnboardingCase {
    const validationError = this.validateCreateCaseData(data);
    if (validationError) throw new Error(validationError);

    const now = Date.now();
    const employee: Employee = {
      guid: uid(),
      name: data.firstName,
      lastName: data.lastName,
      CI: formatCuit(data.CI),
      CUIT: null,
      birthday: data.birthday,
      email: data.personalEmail,
      corporateEmail: null,
      CBU: null,
      cityId: data.cityId,
      provinceId: data.provinceId,
      countryId: data.countryId,
      startDate: data.startDate,
      status: 'inactive',
      role: data.role,
      team: data.team,
      contractType: data.contractType,
      managerName: data.managerName,
    };

    const suggestedEmail = generateCorporateEmail(data.firstName, data.lastName);
    const suggestedGroups = evaluateGroups(employee);
    const emailTemplate = createEmailTemplate('¡Bienvenida/o a Zafirus Technologies!', DEFAULT_EMAIL_HTML, {
      welcomeMeetingTime: data.welcomeMeetingTime || '',
      welcomeMeetingLink: data.welcomeMeetingLink || '',
      managerMeetingTime: data.managerMeetingTime || '',
      managerMeetingLink: data.managerMeetingLink || '',
      onboardingFolderUrl: data.onboardingFolderUrl || '',
      kitRedesUrl: data.kitRedesUrl || '',
    });

    const id = uid();
    const newCase: OnboardingCase = {
      id,
      employee,
      status: 'draft',
      candidateToken: uid(),
      candidateTokenExpiresAt: now + 7 * 24 * 3600000,
      candidateData: createInitialCandidateData(),
      emailTemplate,
      suggestedEmail,
      suggestedGroups,
      tasks: [],
      auditLog: [makeAudit('case_created', 'onboarding_case', id)],
      correctionNote: null,
      blockReason: null,
      createdAt: now,
      updatedAt: now,
    };

    this.state.updateCases(cases => [...cases, newCase]);
    this.state.setSelectedCaseId(id);
    this.state.addToast('success', 'Caso creado', `${data.firstName} ${data.lastName}`);
    this.state._persistToStorage();
    return newCase;
  }

  updateCase(caseId: string, updates: Partial<OnboardingCase>): void {
    this.state.updateCases(cases => cases.map(c => c.id === caseId ? { ...c, ...updates, updatedAt: Date.now() } : c));
    this.state._persistToStorage();
  }

  deleteCase(caseId: string): void {
    this.state.updateCases(cases => cases.filter(c => c.id !== caseId));
    if (this.state.selectedCaseId() === caseId) {
      this.state.setSelectedCaseId(this.state.cases()[0]?.id ?? null);
    }
    this.state._persistToStorage();
  }

  updateEmployee(caseId: string, updates: Partial<Employee>): void {
    this.state.updateCases(cases => cases.map(c => (
      c.id === caseId ? { ...c, employee: { ...c.employee, ...updates }, updatedAt: Date.now() } : c
    )));
    this.state._persistToStorage();
  }

  seedDemo(): void {
    const now = Date.now();
    const day = 24 * 3600000;
    const inDays = (days: number) => new Date(now + days * day).toISOString().split('T')[0];
    const hoursAgo = (hours: number) => now - hours * 3600000;

    const makeCandidateData = (overrides: Partial<CandidateData> = {}): CandidateData => ({
      ...createInitialCandidateData(),
      ...overrides,
    });

    const makeEmailTemplate = (status: EmailTemplate['status'], sentAt: number | null = null, scheduledFor: number | null = null): EmailTemplate => ({
      subject: '¡Bienvenida/o a Zafirus Technologies!',
      bodyHtml: DEFAULT_EMAIL_HTML,
      welcomeMeetingTime: '',
      welcomeMeetingLink: '',
      managerMeetingTime: '',
      managerMeetingLink: '',
      onboardingFolderUrl: 'https://drive.google.com/drive/folders/onboarding',
      kitRedesUrl: 'https://drive.google.com/drive/folders/kitredes',
      temporaryPassword: generateTemporaryPassword(),
      approvedAt: null,
      sentAt,
      scheduledFor,
      status,
    });

    const makeTaskState = (
      type: TaskType,
      status: 'pending' | 'success',
      owner: OnboardingTask['owner'] = 'system',
      metadata?: Record<string, unknown>,
      offsetHours = 2,
    ): OnboardingTask => ({
      ...makeTask(type, owner, metadata),
      status,
      startedAt: status === 'success' ? hoursAgo(offsetHours) : null,
      completedAt: status === 'success' ? hoursAgo(offsetHours - 0.5) : null,
    });

    type SeedCaseConfig = {
      data: CreateCaseData;
      status: CaseStatus;
      updatedHoursAgo: number;
      employeeStatus?: 'active' | 'inactive';
      candidateData?: CandidateData;
      emailTemplate?: EmailTemplate;
      suggestedEmail?: string | null;
      suggestedGroups?: GroupSuggestion[];
      tasks?: OnboardingTask[];
      auditActions?: Array<{ action: string; actorType?: 'user' | 'system' | 'integration'; actorId?: string; details?: Record<string, unknown> }>;
      correctionNote?: string | null;
      blockReason?: string | null;
    };

    const makeSeedCase = (config: SeedCaseConfig): OnboardingCase => {
      const id = uid();
      const employee: Employee = {
        guid: uid(),
        name: config.data.firstName,
        lastName: config.data.lastName,
        CI: config.data.CI,
        CUIT: null,
        birthday: config.data.birthday,
        email: config.data.personalEmail,
        corporateEmail: config.employeeStatus === 'active' ? (config.suggestedEmail ?? generateCorporateEmail(config.data.firstName, config.data.lastName)) : null,
        CBU: null,
        cityId: config.data.cityId,
        provinceId: config.data.provinceId,
        countryId: config.data.countryId,
        startDate: config.data.startDate,
        status: config.employeeStatus ?? 'inactive',
        role: config.data.role,
        team: config.data.team,
        contractType: config.data.contractType,
        managerName: config.data.managerName,
      };

      const suggestedEmail = config.suggestedEmail ?? generateCorporateEmail(config.data.firstName, config.data.lastName);
      const suggestedGroups = config.suggestedGroups ?? evaluateGroups(employee);

      return {
        id,
        employee,
        status: config.status,
        candidateToken: uid(),
        candidateTokenExpiresAt: now + 7 * day,
        candidateData: config.candidateData ?? makeCandidateData(),
        emailTemplate: config.emailTemplate ?? makeEmailTemplate(
          config.status === 'active_pending_automation' || config.status === 'operative' ? 'sent' : 'draft',
          config.status === 'active_pending_automation' || config.status === 'operative' ? hoursAgo(7) : null,
        ),
        suggestedEmail,
        suggestedGroups,
        tasks: config.tasks ?? [],
        auditLog: [
          makeAudit('case_created', 'onboarding_case', id),
          ...(config.auditActions ?? []).map(action => makeAudit(action.action, 'onboarding_case', id, action.actorType ?? 'user', action.actorId ?? 'rrhh', action.details)),
        ],
        correctionNote: config.correctionNote ?? null,
        blockReason: config.blockReason ?? null,
        createdAt: hoursAgo(config.updatedHoursAgo + 24),
        updatedAt: hoursAgo(config.updatedHoursAgo),
      };
    };

    const seededCases: OnboardingCase[] = [
      makeSeedCase({
        data: {
          firstName: 'Sofía', lastName: 'López', CI: '30123456', birthday: '1992-03-15',
          personalEmail: 'sofia.lopez@gmail.com', countryId: 'AR', provinceId: 'Buenos Aires', cityId: 'CABA',
          startDate: inDays(18), role: 'Product Manager', team: 'product', contractType: 'employee', managerName: 'Carlos Ruiz',
          welcomeMeetingTime: '15/01 - 10:00 hs', welcomeMeetingLink: 'https://meet.google.com/abc-defg-hij',
          managerMeetingTime: '15/01 - 14:00 hs', managerMeetingLink: 'https://meet.google.com/xyz-uvwx-rst',
          onboardingFolderUrl: 'https://drive.google.com/drive/folders/onboarding',
          kitRedesUrl: 'https://drive.google.com/drive/folders/kitredes',
        },
        status: 'draft',
        updatedHoursAgo: 72,
      }),
      makeSeedCase({
        data: {
          firstName: 'Lucas', lastName: 'Gómez', CI: '35789012', birthday: '1995-08-22',
          personalEmail: 'lucas.gomez@hotmail.com', countryId: 'CL', provinceId: 'Metropolitana', cityId: 'Santiago',
          startDate: inDays(12), role: 'Diseño UX', team: 'design', contractType: 'contractor', managerName: 'Ana Silva',
        },
        status: 'candidate_invited',
        updatedHoursAgo: 60,
        auditActions: [{ action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' }],
      }),
      makeSeedCase({
        data: {
          firstName: 'Valentina', lastName: 'Martínez', CI: '38900441', birthday: '1994-11-02',
          personalEmail: 'valentina.martinez@proton.me', countryId: 'UY', provinceId: 'Montevideo', cityId: 'Montevideo',
          startDate: inDays(8), role: 'Desarrolladora Frontend', team: 'engineering', contractType: 'employee', managerName: 'Diego Torres',
        },
        status: 'candidate_submitted',
        updatedHoursAgo: 48,
        candidateData: makeCandidateData({
          taxIdType: 'CUIL',
          taxIdValue: '20-38900441-2',
          paymentMethod: 'CBU',
          cbu: '0000003100000000000001',
          bankName: 'Banco Galicia',
          accountNumber: '000123456781',
          references: [
            { id: uid(), fullName: 'Ana Belén Ríos', relationship: 'Lead', company: 'Mapache Studio', email: 'ana.rios@mapache.dev', phone: '+54 11 5555-0303' },
            { id: uid(), fullName: 'Julián Vega', relationship: 'Colleague', company: 'Pixel Works', email: 'julian.vega@pixelworks.io', phone: '+54 11 5555-0404' },
          ],
          files: [{ id: uid(), fileType: 'w8', name: 'W-8 BEN firmado.pdf', sizeBytes: 184320 }],
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          submittedAt: hoursAgo(6),
          consolidated: false,
        }),
        auditActions: [
          { action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' },
          { action: 'candidate_form_submitted', actorType: 'user', actorId: 'candidate' },
        ],
      }),
      makeSeedCase({
        data: {
          firstName: 'Diego', lastName: 'Navarro', CI: '34222001', birthday: '1990-05-19',
          personalEmail: 'diego.navarro@outlook.com', countryId: 'AR', provinceId: 'Córdoba', cityId: 'Córdoba',
          startDate: inDays(5), role: 'Analista de RRHH', team: 'rrhh', contractType: 'employee', managerName: 'Marta Molina',
        },
        status: 'hr_review',
        updatedHoursAgo: 36,
        candidateData: makeCandidateData({
          taxIdType: 'CUIL',
          taxIdValue: '20-34222001-4',
          paymentMethod: 'CBU',
          cbu: '0000003100000000000002',
          bankName: 'Banco Nación',
          accountNumber: '000123456782',
          references: [{ id: uid(), fullName: 'Marina Costa', relationship: 'Former manager', company: 'Andes Labs', email: 'marina.costa@andes.dev', phone: '+54 11 5555-0505' }],
          files: [{ id: uid(), fileType: 'w8', name: 'Formulario fiscal.pdf', sizeBytes: 213000 }],
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          submittedAt: hoursAgo(12),
          consolidated: true,
        }),
        auditActions: [
          { action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' },
          { action: 'candidate_form_submitted', actorType: 'user', actorId: 'candidate' },
          { action: 'review_started', actorType: 'user', actorId: 'rrhh' },
        ],
      }),
      makeSeedCase({
        data: {
          firstName: 'Camila', lastName: 'Torres', CI: '40111223', birthday: '1993-07-08',
          personalEmail: 'camila.torres@icloud.com', countryId: 'PE', provinceId: 'Lima', cityId: 'Lima',
          startDate: inDays(3), role: 'Operations Lead', team: 'leadership', contractType: 'employee', managerName: 'Nicolás Prado',
        },
        status: 'ready_to_activate',
        updatedHoursAgo: 24,
        candidateData: makeCandidateData({
          taxIdType: 'RUC',
          taxIdValue: '20123456789',
          paymentMethod: 'WIRE',
          bankName: 'BBVA Perú',
          accountNumber: '0011223344',
          swift: 'BCPUPLPX',
          beneficiaryAddress: 'Av. Arequipa 1234, Lima',
          references: [{ id: uid(), fullName: 'Esteban Pardo', relationship: 'Peer', company: 'Nexo SA', email: 'esteban.pardo@nexo.com', phone: '+51 1 555 0606' }],
          files: [{ id: uid(), fileType: 'w8', name: 'ID y contrato.pdf', sizeBytes: 287640 }],
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          submittedAt: hoursAgo(20),
          consolidated: true,
        }),
        emailTemplate: makeEmailTemplate('draft'),
        auditActions: [
          { action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' },
          { action: 'candidate_form_submitted', actorType: 'user', actorId: 'candidate' },
          { action: 'review_started', actorType: 'user', actorId: 'rrhh' },
          { action: 'case_approved', actorType: 'user', actorId: 'rrhh' },
        ],
      }),
      makeSeedCase({
        data: {
          firstName: 'Juan', lastName: 'Herrera', CI: '36333009', birthday: '1989-02-11',
          personalEmail: 'juan.herrera@gmail.com', countryId: 'MX', provinceId: 'Ciudad de México', cityId: 'CDMX',
          startDate: inDays(2), role: 'Backend Engineer', team: 'engineering', contractType: 'employee', managerName: 'Patricia Campos',
        },
        status: 'active_pending_automation',
        updatedHoursAgo: 12,
        employeeStatus: 'active',
        candidateData: makeCandidateData({
          taxIdType: 'RFC',
          taxIdValue: 'HEJ890211ABC',
          paymentMethod: 'WIRE',
          bankName: 'BBVA México',
          accountNumber: '9876543210',
          swift: 'BCMRMXMM',
          beneficiaryAddress: 'Paseo de la Reforma 100, CDMX',
          references: [{ id: uid(), fullName: 'Sara López', relationship: 'Manager', company: 'Orbit Labs', email: 'sara.lopez@orbit.io', phone: '+52 55 5555 0707' }],
          files: [{ id: uid(), fileType: 'w8', name: 'Constancia fiscal.pdf', sizeBytes: 194512 }],
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          submittedAt: hoursAgo(30),
          consolidated: true,
        }),
        emailTemplate: makeEmailTemplate('sent', hoursAgo(6)),
        suggestedGroups: evaluateGroups({
          guid: 'seed', name: 'Juan', lastName: 'Herrera', CI: '36333009', CUIT: null, birthday: '1989-02-11', email: 'juan.herrera@gmail.com', corporateEmail: 'jherrera@zafirus.tech', CBU: null,
          cityId: 'CDMX', provinceId: 'Ciudad de México', countryId: 'MX', startDate: inDays(2), status: 'active', role: 'Backend Engineer', team: 'engineering', contractType: 'employee', managerName: 'Patricia Campos',
        }).map((group, index) => ({ ...group, status: index < 2 ? 'added' as const : 'pending' as const, workspaceGroupId: index < 2 ? uid() : null })),
        tasks: [
          makeTaskState('CREATE_GOOGLE_USER', 'success', 'system', { email: 'jherrera@zafirus.tech' }, 5),
          makeTaskState('ADD_GOOGLE_GROUPS', 'success', 'system', { groups: ['all@zafirus.tech', 'engineering@zafirus.tech'] }, 4),
          makeTaskState('CONFIGURE_GMAIL_SIGNATURE', 'pending', 'system', undefined, 3),
          makeTaskState('SEND_WELCOME_EMAIL', 'pending', 'system', { to: ['jherrera@zafirus.tech', 'juan.herrera@gmail.com'] }, 3),
          makeTaskState('ANNOUNCE_IN_GROUPS', 'pending', 'system', { groupEmail: 'all@zafirus.tech', groupName: 'Todo el equipo' }, 3),
          makeTaskState('POST_INTERNAL_ANNOUNCEMENT', 'pending', 'system', undefined, 3),
          makeTaskState('REQUEST_DEVICE', 'pending', 'it', undefined, 3),
          makeTaskState('NOTIFY_ADMINISTRATION', 'pending', 'admin', undefined, 3),
        ],
        auditActions: [
          { action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' },
          { action: 'candidate_form_submitted', actorType: 'user', actorId: 'candidate' },
          { action: 'review_started', actorType: 'user', actorId: 'rrhh' },
          { action: 'case_approved', actorType: 'user', actorId: 'rrhh' },
          { action: 'case_activated', actorType: 'system', actorId: 'automation' },
        ],
      }),
      makeSeedCase({
        data: {
          firstName: 'Lucía', lastName: 'Ramírez', CI: '33445566', birthday: '1991-09-27',
          personalEmail: 'lucia.ramirez@gmail.com', countryId: 'AR', provinceId: 'Mendoza', cityId: 'Mendoza',
          startDate: inDays(1), role: 'Finance Analyst', team: 'administration', contractType: 'employee', managerName: 'Gonzalo Fernández',
        },
        status: 'operative',
        updatedHoursAgo: 3,
        employeeStatus: 'active',
        candidateData: makeCandidateData({
          taxIdType: 'CUIL',
          taxIdValue: '27-33445566-8',
          paymentMethod: 'CBU',
          cbu: '0000003100000000000003',
          bankName: 'Banco Patagonia',
          accountNumber: '000123456783',
          references: [{ id: uid(), fullName: 'Marcos León', relationship: 'Manager', company: 'Southwind Co', email: 'marcos.leon@southwind.dev', phone: '+54 11 5555 0808' }],
          files: [{ id: uid(), fileType: 'w8', name: 'Documentación completa.pdf', sizeBytes: 304120 }],
          currentStep: 5,
          completedSteps: [1, 2, 3, 4, 5],
          submittedAt: hoursAgo(40),
          consolidated: true,
        }),
        emailTemplate: makeEmailTemplate('sent', hoursAgo(9)),
        suggestedGroups: evaluateGroups({
          guid: 'seed', name: 'Lucía', lastName: 'Ramírez', CI: '33445566', CUIT: null, birthday: '1991-09-27', email: 'lucia.ramirez@gmail.com', corporateEmail: 'lramirez@zafirus.tech', CBU: null,
          cityId: 'Mendoza', provinceId: 'Mendoza', countryId: 'AR', startDate: inDays(1), status: 'active', role: 'Finance Analyst', team: 'administration', contractType: 'employee', managerName: 'Gonzalo Fernández',
        }).map(group => ({ ...group, status: 'added' as const, workspaceGroupId: uid() })),
        tasks: [
          makeTaskState('CREATE_GOOGLE_USER', 'success', 'system', { email: 'lramirez@zafirus.tech' }, 8),
          makeTaskState('ADD_GOOGLE_GROUPS', 'success', 'system', { groups: ['all@zafirus.tech', 'administration@zafirus.tech', 'argentina@zafirus.tech'] }, 7),
          makeTaskState('CONFIGURE_GMAIL_SIGNATURE', 'success', 'system', undefined, 6),
          makeTaskState('SEND_WELCOME_EMAIL', 'success', 'system', { to: ['lramirez@zafirus.tech', 'lucia.ramirez@gmail.com'] }, 5),
          makeTaskState('ANNOUNCE_IN_GROUPS', 'success', 'system', { groupEmail: 'all@zafirus.tech', groupName: 'Todo el equipo' }, 4),
          makeTaskState('POST_INTERNAL_ANNOUNCEMENT', 'success', 'system', undefined, 3),
          makeTaskState('REQUEST_DEVICE', 'success', 'it', undefined, 2),
          makeTaskState('NOTIFY_ADMINISTRATION', 'success', 'admin', undefined, 1),
        ],
        auditActions: [
          { action: 'candidate_form_sent', actorType: 'system', actorId: 'automation' },
          { action: 'candidate_form_submitted', actorType: 'user', actorId: 'candidate' },
          { action: 'review_started', actorType: 'user', actorId: 'rrhh' },
          { action: 'case_approved', actorType: 'user', actorId: 'rrhh' },
          { action: 'case_activated', actorType: 'system', actorId: 'automation' },
          { action: 'case_operative', actorType: 'system', actorId: 'automation' },
        ],
      }),
    ];

    this.state.setCases(seededCases);
    this.state.setSelectedCaseId(seededCases[0]?.id ?? null);
    this.state.setWizardCaseIndex(0);
    this.state.setCandidateViewOpen(false);
    this.state.setSidebarOpen(true);
    this.state._persistToStorage();
  }
}
