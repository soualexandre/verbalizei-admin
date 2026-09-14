// Enums espelhando o schema Prisma da API (elovoz-api)

export type UserRole = "ADMIN" | "USER";
export type UserPlan = "FREE" | "PREMIUM";
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

export interface DashboardData {
  users: {
    total: number;
    premium: number;
    free: number;
    admin: number;
    activeMonth: number;
    activeWeek: number;
    newMonth: number;
    conversionRate: number;
  };
  payments: {
    total: number;
    approved: number;
    totalRevenue: number;
  };
  saas: {
    mrr: number;
    arr: number;
    churnRateMonthly: number;
    arpu: number;
    ltv: number;
    activeSubscribers: number;
    churnedSubscribers30d: number;
  };
}

export interface TodayInsight {
  summary?: string;
  riskSignals?: string[];
  retentionStrategies?: string[];
  metrics?: {
    dailyActiveUsers?: number;
    weeklyActiveUsers?: number;
    newUsersLast7d?: number;
    lessonsCompletedLast7d?: number;
    challengeAccuracyLast7d?: number;
    avgVoiceScoreLast7d?: number;
  };
  generatedAt?: string;
  [key: string]: unknown;
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
  _count: {
    completions: number;
    payments: number;
    purchases: number;
    recordings: number;
    submissions: number;
    practiceSessions: number;
    trainingSessions: number;
  };
  totalPoints: number;
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
  recordings: Array<{
    id: string;
    createdAt: string;
    averageScore: number | null;
    clarity: number | null;
    pace: number | null;
    volume: number | null;
    pronunciation: number | null;
    suggestions: string[];
  }>;
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
}

// ─── Curriculum ──────────────────────────────────────────────────────────────

export interface Unit {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  order: number;
  isActive: boolean;
  segments?: UserSegment[];
  createdAt?: string;
  updatedAt?: string;
  _count?: { sessions?: number; challenges?: number };
  sessions?: Session[];
}

export interface Session {
  id: string;
  unitId: string;
  title: string;
  description: string | null;
  guideCovered: string | null;
  guideHowToPass: string | null;
  order: number;
  isFree: boolean;
  unit?: Unit;
  _count?: { lessons?: number };
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  sessionId: string;
  type: string;
  position: number;
  isActive: boolean;
  isPromotionLesson: boolean;
  seniorityLevel: SeniorityLevel | null;
  session?: Session;
  _count?: { challenges?: number };
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
  options?: ChallengeOption[];
  unit?: Unit;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonChallengeLink {
  id: string;
  lessonId: string;
  challengeId: string;
  order: number;
  challenge?: Challenge;
}

// ─── Perfis ──────────────────────────────────────────────────────────────────

export type ProfileDimensionKey =
  | "persona"
  | "objective"
  | "audience"
  | "obstacle"
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

export type AnswerField = "objective" | "audience" | "obstacle";

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
  includeMocks: boolean;
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
  practice: Array<{
    theme: string | null;
    preset: string | null;
    customContext: string | null;
    customScenario: string | null;
  }>;
  studiedUnits: Array<{ title: string; segments: string[]; lessons: number }>;
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
