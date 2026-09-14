# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Equipe interna do Verbalizei com conta `ADMIN`. Para a análise de perfis, o leitor principal é **marketing / aquisição**: quer descobrir qual perfil de usuário atrair mais (ICP) e onde investir, sem precisar interpretar planilhas.

Outros usos do painel (inferidos do código): operação de usuários, gestão de currículo, broadcast de e-mail/push e acompanhamento de métricas SaaS.

## Product Purpose

Painel administrativo do Verbalizei, app de treino de oratória e comunicação com gamificação (lições, desafios de voz, treinos com IA, streak, XP, senioridade). O admin existe para operar a plataforma e transformar dados de uso em decisões.

## Operating Context

- Consome a API NestJS `verbalizei-api` (Prisma + PostgreSQL) via `/api/admin/*`.
- Perfil do usuário vem do onboarding do app: foco (`objective`: ACADEMIC, PROFESSIONAL, HIGH_IMPACT, OTHER), papel/contexto (`audience`), principal dificuldade (`obstacle`) e `segment` derivado (EDUCACAO, VENDAS, LIDERANCA, OUTROS; CONTEUDO e PREGACAO existem no enum). Onboardings antigos e usuários mock usam outros códigos.
- Usuários mock (`isMock`) existem na base e devem ficar fora das análises por padrão.
- "Acessar a plataforma" é medido por **dias ativos**: dias distintos com atividade real (lições concluídas, submissões de desafio, gravações, treinos, práticas). `lastLoginAt` guarda só o último login, sem histórico.

## Capabilities and Constraints

- Next.js 15 App Router, React 19, Tailwind v4, shadcn/ui, TanStack Query, Recharts, lucide-react.
- Interface em português (pt-BR).
- Não há histórico de logins nem dados demográficos (idade, cidade, gênero); não inventar essas dimensões.

## Evidence on Hand

Dados reais só via API em runtime. Não há benchmarks de mercado nem metas de negócio registradas; conclusões devem vir apenas dos dados da base.

## Product Principles

1. Entregar conclusão, não só gráfico: cada análise diz o que o dado significa e o que fazer.
2. Separar volume de intensidade: o perfil mais numeroso não é necessariamente o mais engajado.
3. Ser honesto com amostras pequenas: sinalizar baixa confiança em vez de afirmar.
4. Linguagem direta de negócio, sem jargão estatístico.
