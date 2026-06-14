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
