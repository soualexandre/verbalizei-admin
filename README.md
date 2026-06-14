# Verbalizei Admin

Painel administrativo do Verbalizei — Next.js 15 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query.

Consome a API NestJS (`elovoz-api`) via rotas `/api/admin/*` e `/api/auth/*`. O acesso exige uma conta com `role = ADMIN`.

## Requisitos

- Node 20+
- A API `elovoz-api` rodando (porta padrão `3010`, prefixo `/api`)

## Configuração

```bash
cp .env.local.example .env.local   # ajuste NEXT_PUBLIC_API_URL se necessário
npm install
npm run dev                         # http://localhost:3005
```

`NEXT_PUBLIC_API_URL` deve apontar para a base da API **incluindo** o `/api`
(ex.: `http://localhost:3010/api`). Garanta que a origem `http://localhost:3005`
está liberada no CORS da API (variável `CORS_EXTRA_ORIGINS` ou `FRONTEND_URL`).

Para tornar um usuário administrador, use o script da API:
`npm run make:admin` (no projeto `elovoz-api`).

## Funcionalidades

- **Login** — autenticação JWT (`POST /auth/login`); bloqueia contas não-admin.
- **Dashboard** — KPIs de usuários, pagamentos e métricas SaaS (MRR, ARR, ARPU, LTV, churn).
- **Insights IA** — diagnóstico diário de retenção (`/admin/insights/today`).
- **Usuários** — listagem com filtros (plano, papel, segmento, mocks), busca e
  paginação; detalhe (onboarding, gravações, treinos); edição de plano/papel/status;
  exclusão; migração de trilhas por segmento.
- **Currículo** — CRUD de unidades → módulos → lições; banco de desafios com
  CRUD, opções, upload de imagem (S3), regeneração de URL e geração de variantes
  por IA; vinculação e reordenação de desafios por lição.
- **Broadcast** — envio em massa de e-mails e push notifications, com modo
  simulação (dry-run) e segmentação (todos / segmento / IDs).

## Estrutura

```
src/
  app/
    login/                 # tela de login
    (panel)/               # área autenticada (sidebar + guarda de rota)
      dashboard/
      insights/
      users/[id]/
      curriculum/
        units/[id]/        # módulos
        sessions/[id]/     # lições
        lessons/[id]/      # desafios vinculados
        challenges/        # banco de desafios
      broadcast/
  components/ui/           # primitivas shadcn/ui
  lib/                     # api client, auth, tipos, utils
```
