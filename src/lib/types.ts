// Enums espelhando o schema Prisma da API (elovoz-api)

export type UserRole = "ADMIN" | "USER";
export type UserPlan = "FREE" | "STARTER" | "PREMIUM";
export type UserSegment =
  | "VENDAS"
  | "PREGACAO"
  | "CONTEUDO"
  | "EDUCACAO"
  | "LIDERANCA"
  | "OUTROS";
export type SeniorityLevel =
  | "ESTAGIARIO"
  | "JUNIOR"
  | "PLENO"
  | "SENIOR"
  | "MASTER";
export type ChallengeType =
  | "MULTIPLE_CHOICE"
  | "SELECT_IMAGE"
  | "VOICE_RECORDING"
  | "LISTENING"
  | "TRANSLATION"
  | "FILL_BLANK";
export type AnalysisType = "LEITURA_EXATA" | "CRIATIVO" | "PADRAO";
export type BroadcastTargetType = "ALL" | "SEGMENT" | "USERS";

export const USER_SEGMENTS: UserSegment[] = [
  "VENDAS",
  "PREGACAO",
  "CONTEUDO",
  "EDUCACAO",
  "LIDERANCA",
  "OUTROS",
];

export const SENIORITY_LEVELS: SeniorityLevel[] = [
  "ESTAGIARIO",
  "JUNIOR",
  "PLENO",
  "SENIOR",
  "MASTER",
];

export const CHALLENGE_TYPES: ChallengeType[] = [
  "MULTIPLE_CHOICE",
  "SELECT_IMAGE",
  "VOICE_RECORDING",
  "LISTENING",
  "TRANSLATION",
  "FILL_BLANK",
];

export const ANALYSIS_TYPES: AnalysisType[] = [
  "LEITURA_EXATA",
  "CRIATIVO",
  "PADRAO",
];

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt: string | null;
  hasCompletedOnboarding: boolean;
  segment: UserSegment | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

/** GET /admin/overview (verbalizei-api src/admin/dashboard-overview.ts). */
export type InteractionKind = "scenarios" | "recordings" | "micro" | "games";
export type ByKind = Record<InteractionKind, number>;

export interface Kpi {
  value: number;
  previous: number;
}

export interface DashboardOverview {
  period: { days: number; from: string; to: string };
  totals: { users: number; premium: number; admins: number };
  kpis: {
    activeUsers: Kpi;
    /** `activated`: dos novos, quantos já fizeram a primeira interação. */
    newUsers: Kpi & { activated: number };
    interactions: Kpi & { byKind: ByKind };
    /** % dos ativos no período anterior que voltaram neste (null sem base). */
    retention: { value: number | null; previous: number | null; base: number };
  };
  daily: Array<{ day: string; activeUsers: number } & ByKind>;
  /** Semana de cadastro (segunda-feira) e % ativo nas semanas 0–4 depois dela; null = ainda não chegou. */
  cohorts: Array<{ week: string; size: number; retention: (number | null)[] }>;
  topScenarios: Array<{ id: string; title: string; sessions: number; users: number }>;
  scenarioCompletion: { started: number; completed: number };
  /** Volta depois do micro-treino: dia seguinte (D1) e do 2º ao 7º dia. API antiga: ausente. */
  microReturn?: {
    nextDay: ReturnRate;
    nextWeek: ReturnRate;
  };
  /** Latência do treino curto (s) nos últimos 7 dias, por perfil; null = sem jobs. API antiga: ausente. */
  drillLatency?: Record<"text" | "voice" | "full", LatencyStats | null>;
  /** As 24 horas (fuso de Brasília): interações que começaram em cada hora e pessoas diferentes. API antiga: ausente. */
  hourly?: Array<{ hour: number; interactions: number; users: number }>;
  /**
   * Dia da semana (1 = segunda … 7 = domingo, Brasília): interações, pessoas,
   * quantas vezes o dia caiu no período e a média por ocorrência. API antiga: ausente.
   */
  weekday?: Array<{ weekday: number; interactions: number; users: number; days: number; average: number }>;
  /** 7 × 24 (segunda primeiro): interações por dia da semana e hora. API antiga: ausente. */
  heatmap?: number[][];
  /** Funil dos novos do período. API antiga: ausente. */
  activation?: { signups: number; onboarded: number; firstTraining: number; returned: number };
}

/** GET /admin/overview/day?day=YYYY-MM-DD (verbalizei-api src/admin/day-activity.ts): quem treinou no dia e em quê. */
export interface DayActivity {
  day: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    count: number;
    items: Array<{
      kind: InteractionKind;
      /** Título do cenário, tema do treino curto, "Jogo"… */
      label: string;
      /** ISO. */
      at: string;
      score: number | null;
      xp: number | null;
    }>;
  }>;
}

export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
}

export interface ReturnRate {
  value: number | null;
  previous: number | null;
  /** Dias-pessoa com micro-treino que entraram na conta. */
  base: number;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  role: UserRole;
  plan: UserPlan;
  planExpiresAt: string | null;
  emailVerified: boolean;
  isMock: boolean;
  mockSegment: string | null;
  hasCompletedOnboarding: boolean;
  onboardingData: Record<string, unknown> | null;
  provider: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  progress: {
    streak: number;
    gems: number;
    seniorityLevel: SeniorityLevel;
  } | null;
  /** XP de cenários, micro-treinos e jogos. */
  totalPoints: number;
  /**
   * Interações: um contador só de tudo o que a pessoa fez (a métrica de
   * engajamento). API antiga: ausente.
   */
  interactions?: UserInteractions;
  meetingsBeta?: boolean;
}

/** Cenários + gravações (inclui o 1º reconhecimento) + micro-treinos + jogos. */
export interface UserInteractions {
  total: number;
  /** Sessões de cenário concluídas ou com alguma gravação. */
  scenarios: number;
  /** Análises avulsas: o 1º treino de reconhecimento e "Analisar um áudio". */
  recordings: number;
  /** Treinos curtos concluídos e desafios de voz das lições. */
  micro: number;
  /** Rodadas de jogos terminadas. */
  games: number;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserDetail {
  onboarding: {
    data: Record<string, unknown> | null;
    segment: UserSegment | null;
  };
  /** O que a pessoa fez no app, por tipo (a mesma conta da lista). */
  interactions: UserInteractions;
  trainingAttempts: Array<{
    id: string;
    createdAt: string;
    overallScore: number | null;
    partLabel: string | null;
    positives: string[];
    improvements: string[];
    tip: string | null;
  }>;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  dryRun: boolean;
  /** Envio real: a API manda em segundo plano, sent/failed não são finais. */
  queued?: boolean;
}

// ─── Micro-treinos ───────────────────────────────────────────────────────────

/** Gap de fala que um micro-treino ataca (SkillGap, só o que a lista usa). */
export interface SkillGapRef {
  id: string;
  slug: string;
  label: string;
  priority: number;
}

export interface ChallengeOption {
  id: string;
  challengeId: string;
  text: string | null;
  imageUrl: string | null;
  isCorrect: boolean;
  order: number;
}

export interface Challenge {
  id: string;
  unitId: string;
  type: ChallengeType;
  question: string | null;
  topic: string | null;
  tongueTwister: string | null;
  minDuration: number | null;
  maxDuration: number | null;
  correctSentence: unknown;
  words: unknown;
  xpReward: number;
  seniorityLevel: SeniorityLevel | null;
  isPromotionChallenge: boolean;
  requiredMetrics: unknown;
  analysisType: AnalysisType | null;
  textoAlvo: string | null;
  objetivoEsperado: string | null;
  imageUrl: string | null;
  /** Micro-treino: fora da trilha, servido pela recomendação de gaps. */
  isDrill?: boolean;
  gapId?: string | null;
  drillOrder?: number;
  /** CENARIO | LEITURA | JOGO | RECONHECIMENTO */
  drillFormat?: string | null;
  drillContexts?: string[];
  drillRule?: string | null;
  gap?: SkillGapRef | null;
  options?: ChallengeOption[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Perfis ──────────────────────────────────────────────────────────────────

export type ProfileDimensionKey =
  | "persona"
  | "objective"
  | "audience"
  | "obstacle"
  | "careerStage"
  | "segment"
  | "plan"
  | "seniority"
  | "tenure"
  | "device"
  | "provider";

export interface ProfileGroupStats {
  key: string;
  label: string;
  /** Grupo sem informação (ex.: sem onboarding). */
  unknown: boolean;
  users: number;
  activeUsers: number;
  activeDays: number;
  recurringUsers: number;
  premiumUsers: number;
  newUsers: number;
  avgStreak: number;
  /** Frações 0..1 */
  shareOfBase: number;
  shareOfActiveDays: number;
  /** shareOfActiveDays / shareOfBase — 1 = média */
  accessIndex: number;
  activationRate: number;
  daysPerActiveUser: number;
  recurringRate: number;
  premiumRate: number;
  /** Usuários que entraram no grupo pelo perfil inferido. */
  inferredUsers: number;
  /** Sem resposta clara ("Outro", texto livre, sem dado): pode ser detalhado. */
  vague: boolean;
}

export type AnswerField = "objective" | "audience" | "obstacle" | "careerStage";

export interface ProfileGroupDetail {
  dimension: { key: ProfileDimensionKey; label: string };
  group: { key: string; label: string; users: number; vague: boolean };
  period: { allTime: boolean; days: number };
  writtenUsers: number;
  texts: Array<{
    field: AnswerField | "persona";
    fieldLabel: string;
    text: string;
    users: number;
  }>;
  data: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    activeDays: number;
    onboardingCompleted: boolean;
    declaredSegment: string | null;
    declaredSegmentLabel: string | null;
    answers: Record<AnswerField, { raw: string; label: string | null; written: boolean } | null>;
    /** Slug do cenário da primeira sala (onboarding web). */
    firstRoom: string | null;
    /** Pulou parte do onboarding web. */
    onboardingSkipped: boolean;
    inferred: {
      segmentLabel: string | null;
      occupation: string | null;
      summary: string | null;
      confidence: number | null;
    } | null;
  }>;
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface ProfileDimension {
  key: ProfileDimensionKey;
  label: string;
  description: string;
  ordered: boolean;
  groups: ProfileGroupStats[];
}

export interface ProfilesAnalysis {
  generatedAt: string;
  period: {
    /** Análise sobre toda a história da plataforma. */
    allTime: boolean;
    days: number;
    from: string;
    to: string;
    /** null em todo o período: recorrente = 1 dia ativo por semana desde o cadastro. */
    recurringThreshold: number | null;
  };
  includeInferred: boolean;
  inferredUsers: number;
  base: ProfileGroupStats;
  onboardedRate: number;
  dimensions: ProfileDimension[];
}

// ─── Enriquecimento de perfil ────────────────────────────────────────────────

export type EnrichmentReason = "NO_ONBOARDING" | "FREE_TEXT" | "NO_SEGMENT";
export type EnrichmentStatus = "READY" | "INSUFFICIENT_DATA" | "FAILED";
export type EnrichmentListStatus = EnrichmentStatus | "NOT_PROCESSED";

export interface EnrichmentRunState {
  running: boolean;
  trigger: "manual" | "schedule" | null;
  startedAt: string | null;
  finishedAt: string | null;
  total: number;
  processed: number;
  ready: number;
  insufficient: number;
  failed: number;
  skippedUnchanged: number;
  error: string | null;
}

export interface EnrichmentSummary {
  candidates: number;
  reasons: Record<EnrichmentReason, number>;
  status: Record<EnrichmentListStatus, number>;
  applied: number;
  applicableHighConfidence: number;
  inferredSegments: Array<{
    key: UserSegment;
    label: string;
    users: number;
    avgConfidence: number;
  }>;
  topOccupations: Array<{ label: string; users: number }>;
  topIndustries: Array<{ label: string; users: number }>;
  lastEnrichedAt: string | null;
  llmAvailable: boolean;
  run: EnrichmentRunState;
}

export interface EnrichmentSimulation {
  candidates: number;
  toProcess: number;
  queued: number;
  withoutEvidence: number;
  skippedUnchanged: number;
  limit: number;
  llmAvailable: boolean;
}

export interface ProfileEnrichment {
  status: EnrichmentStatus;
  inferredSegment: UserSegment | null;
  inferredSegmentLabel: string | null;
  inferredObjective: string | null;
  inferredObjectiveLabel: string | null;
  inferredAudience: string | null;
  inferredAudienceLabel: string | null;
  inferredObstacle: string | null;
  inferredObstacleLabel: string | null;
  confidence: number | null;
  occupation: string | null;
  industry: string | null;
  speakingContexts: string[];
  goals: string | null;
  summary: string | null;
  rationale: string | null;
  source: string | null;
  error: string | null;
  appliedAt: string | null;
  updatedAt: string;
}

export interface EnrichmentSignals {
  onboarding: {
    completed: boolean;
    declaredSegment: string | null;
    objective: string | null;
    audience: string | null;
    obstacle: string | null;
  };
  emailDomain: string | null;
  lead: {
    source: string | null;
    context: string | null;
    mainPain: string | null;
    urgency: string | null;
  } | null;
  customScenarios: Array<{ title: string; description: string | null }>;
  scenariosUsed: Array<{ title: string; sessions: number }>;
  /** Habilidades treinadas nos micro-treinos. Perfis gerados antes de 16/10/2026: ausente. */
  practicedGaps?: Array<{ label: string; drills: number }>;
  transcriptExcerpts: string[];
  feedbackComment: string | null;
}

export interface EnrichmentUserRow {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    declaredSegment: UserSegment | null;
  };
  reasons: EnrichmentReason[];
  status: EnrichmentListStatus;
  enrichment: ProfileEnrichment | null;
  canApply: boolean;
}

export interface UserEnrichmentDetail {
  reasons: EnrichmentReason[];
  declaredSegment: UserSegment | null;
  enrichment: (ProfileEnrichment & { signals: EnrichmentSignals | null }) | null;
  canApply: boolean;
}

// ---------------------------------------------------------------------------
// Training quota (contract: verbalizei-api/docs/cota-de-treinos.md)
// ---------------------------------------------------------------------------

export type QuotaPeriod = "WEEK" | "MONTH";

export interface TrainingQuotaStatus {
  /** Valid PREMIUM or ADMIN. When true, remaining is null and limit/bonus/used are 0. */
  unlimited: boolean;
  plan: UserPlan;
  period: QuotaPeriod;
  /** "2026-W39" | "2026-09" */
  periodKey: string;
  periodStart: string;
  /** Start of the next period. */
  resetsAt: string;
  /** From the policy, without bonus. */
  limit: number;
  /** Extra trainings granted in this period. */
  bonus: number;
  used: number;
  remaining: number | null;
}

export interface QuotaPersonRef {
  id: string;
  name: string | null;
  email: string;
}

export interface TrainingQuotaPolicy {
  plan: "FREE";
  limit: number;
  period: QuotaPeriod;
  updatedAt: string | null;
  updatedBy: QuotaPersonRef | null;
  isDefault: boolean;
}

export interface TrainingQuotaCurrentPeriod {
  periodKey: string;
  periodStart: string;
  resetsAt: string;
  consumed: number;
  activeUsers: number;
  usersAtLimit: number;
}

export interface AdminTrainingQuota {
  policy: TrainingQuotaPolicy;
  current: TrainingQuotaCurrentPeriod;
}

export interface UpdateTrainingQuotaPayload {
  limit: number;
  period: QuotaPeriod;
  reason: string;
}

export type TrainingQuotaAuditAction = "POLICY_UPDATED" | "GRANT_CREATED";

export interface TrainingQuotaAuditItem {
  id: string;
  action: TrainingQuotaAuditAction | (string & {});
  actor: QuotaPersonRef;
  targetUser: QuotaPersonRef | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
}

export interface TrainingQuotaAuditPage {
  items: TrainingQuotaAuditItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TrainingQuotaUsageItem {
  id: string;
  sessionId: string | null;
  scenarioTitle: string | null;
  periodKey: string;
  createdAt: string;
}

export interface TrainingQuotaGrantItem {
  id: string;
  amount: number;
  reason: string;
  periodKey: string;
  grantedBy: QuotaPersonRef;
  createdAt: string;
}

export interface UserTrainingQuota {
  status: TrainingQuotaStatus;
  /** Last 50. */
  usages: TrainingQuotaUsageItem[];
  /** Last 20. */
  grants: TrainingQuotaGrantItem[];
}

export interface CreateTrainingQuotaGrantPayload {
  amount: number;
  reason: string;
}

/** GET /admin/reports/activation (verbalizei-api src/admin/activation-report): do cadastro ao hábito. */
export interface ActivationReport {
  generatedAt: string;
  days: number;
  totals: {
    signups: number;
    didSomething: number;
    stuckOnboarding: number;
    createdScenario: number;
    spoke: number;
    returned: number;
  };
  funnel: Array<{ key: string; label: string; people: number; ofSignups: number | null; ofPrevious: number | null; parallel: boolean }>;
  gaps: Array<{ from: string; to: string; lost: number; lostShare: number | null; fix: string }>;
  stuckAt: Array<{ stage: string; people: number; action: string }>;
  signals: string[];
  onboardingDropoff: Array<{ step: string; people: number }>;
  breakdowns: Record<string, Array<{ group: string; signups: number; onboarded: number; enteredRoom: number; spoke: number; returned: number; activation: number | null }>>;
  failures: Array<{ kind: string; code: string; users: number; jobs: number }>;
}

/** GET /admin/users/summary: totalizadores da tela de Usuários (só pessoas reais). */
export interface UsersSummary {
  total: number;
  new7d: number;
  new30d: number;
  active7d: number;
  paying: number;
  onboarded: number;
  /** Nenhuma interação: sala, análise (reconhecimento, gravação, treino curto), jogo, lição, roteiro ou cenário criado. */
  neverInteracted?: number;
  /** API antiga (antes de 25/10/2026): só quem nunca treinou. */
  neverTrained?: number;
}

// ─── Testes A/B (GET /admin/experiments, 25/10/2026) ───────────────────────

export interface ExperimentVariantReport {
  name: string;
  label: string;
  isControl: boolean;
  assigned: number;
  measured: number;
  converted: number;
  rate: number | null;
  probabilityBest: number;
}

export type ExperimentVerdict =
  | { kind: "winner"; variant: string }
  | { kind: "no_difference" }
  | { kind: "running"; missing: number };

export interface ExperimentReport {
  key: string;
  title: string;
  active: boolean;
  startsAt: string;
  metric: string;
  daysRunning: number;
  variants: ExperimentVariantReport[];
  verdict: ExperimentVerdict;
  decision: { minProbability: number; minPerArm: number; maxDays: number };
}
