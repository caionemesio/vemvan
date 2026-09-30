# Implementation Plan: Multi-Tenant Auth

**Branch**: `002-multi-tenant-auth` (trabalho direto na `main`, por decisão do usuário) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-multi-tenant-auth/spec.md`

## Summary

Primeira feature de domínio: empresas (Company) provisionadas pela equipe VemVan, usuários com roles
ADMIN/DRIVER/PASSENGER, login por e-mail e senha no painel (ADMIN) e no app (DRIVER/PASSENGER),
gestão de pessoas pelo ADMIN com senha inicial e troca obrigatória, e isolamento estrito entre
empresas.

A abordagem técnica central é **sessão opaca verificada no banco a cada requisição** (research.md
D1): é o que faz desativação, redefinição de senha e logout valerem na próxima interação sem JWT,
refresh token nem lista de bloqueio. O isolamento é imposto no repository — `companyId` é parâmetro
obrigatório de toda consulta de dado de empresa, vindo sempre do usuário autenticado (D7). O Admin
guarda o token só no servidor do Next, em cookie httpOnly (D3); o Mobile, no `expo-secure-store`
(D4).

## Technical Context

**Language/Version**: TypeScript sobre Node 22 LTS (inalterado desde a feature 001)

**Primary Dependencies**: existentes — NestJS 12, `@nestjs/sequelize`, `sequelize-typescript`,
Umzug, Next.js 16, shadcn/ui, Expo SDK 57 + `expo-router`. **Novas**: `class-validator` e
`class-transformer` (API, D6) e `expo-secure-store ~57.0.4` (Mobile, D4). Hash de senha e tokens
com o `crypto` nativo do Node — sem dependência (D1, D2).

**Storage**: PostgreSQL 16. Novas tabelas `companies`, `users`, `sessions`, `login_throttles`;
remoção de `_foundation_check` ([data-model.md](./data-model.md)).

**Testing**: Vitest + supertest em testes e2e da API contra o banco descartável `vemvan_test`;
testes unitários para hash de senha e token. Admin e Mobile validados pelo
[quickstart.md](./quickstart.md) — Mobile no emulador Android com `agent-device` (D10).

**Target Platform**: API Node; Admin no navegador; Mobile em Android (alvo de verificação) e iOS.

**Project Type**: Monorepo — API + web app + mobile app + package compartilhado (feature 001).

**Performance Goals**: sem meta de throughput nesta feature. A checagem de sessão por requisição é
uma consulta indexada (`token_hash` único) com join em `users` e `companies`.

**Constraints**:
- Empresa e role sempre derivados do usuário autenticado; valores do cliente descartados (FR-017).
- Registro de outra empresa indistinguível de inexistente: `404` (FR-018).
- Acesso cai na próxima interação após desativação ou redefinição de senha (FR-015, FR-016a).
- Senhas e tokens nunca em claro em respostas, logs ou banco (FR-010).
- Migrations do banco de desenvolvimento executadas pelo usuário (`npm run db:migrate*` bloqueado
  para agentes). O setup de testes migra somente bancos com sufixo `_test`.

**Scale/Scope**: 4 tabelas, ~11 endpoints, 1 CLI com 4 comandos, 4 telas no Admin (login, troca de
senha, lista e formulário de pessoas) e 3 no Mobile (login, troca de senha, início).

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Status | Avaliação |
|-----------|--------|-----------|
| I. Spec antes da implementação | ✅ PASS | Spec aprovada, 3 pontos clarificados (Clarifications), checklist 16/16. Escopo travado por FR-022/FR-023: nada de rotas, viagens ou veículos. |
| II. Escopo mínimo e simplicidade | ✅ PASS | Sem JWT, Passport, argon2 nem throttler: `crypto` nativo e um guard próprio (D1, D2, D5). Três dependências novas, cada uma justificada em research.md (D4, D6). Sem paginação, sem RLS, sem papéis acumulados. |
| III. TypeScript e idioma | ✅ PASS | Tabelas, colunas, enums e código em inglês; mensagens ao usuário em português (`contracts/`). |
| IV. Multi-tenant e autorização (NON-NEGOTIABLE) | ✅ PASS | `companyId` em toda entidade de empresa; derivado da sessão, nunca do corpo (whitelist, D6); `companyId` obrigatório nos repositories (D7); autorização só na API, Admin e Mobile apenas escondem ações (FR-019); frontends só falam com a API; token fora do alcance de JS no Admin (D3). |
| V. Camadas explícitas | ✅ PASS | API: Controller → Service → Repository → Sequelize, com controllers finos. Frontends: MVVM nas telas com lógica (login, troca de senha, pessoas) e organização por feature (D12); layouts e componentes visuais sem MVVM. |
| VI. Integridade do domínio | ✅ PASS | Roles exatamente ADMIN/DRIVER/PASSENGER, sem `USER` (FR-003). Usuários nunca apagados (FR-006), preservando o histórico que TripPassenger vai precisar. |
| VII. Testes guiados por risco | ✅ PASS | Testes e2e cobrem exatamente os riscos citados pelo princípio: isolamento multi-tenant e autorização por role (FR-021, D10). Sem meta de cobertura. |

**Resultado pré-Fase 0**: aprovado, sem violações.

**Reavaliação pós-Fase 1**: aprovado, sem violações. O design adicionou uma tabela fora do tenant,
`login_throttles`. Não é entidade de negócio e não guarda dado de empresa; existe justamente para
não revelar se um e-mail pertence a alguma empresa (D5), o que reforça o Princípio IV em vez de
violá-lo.

## Project Structure

### Documentation (this feature)

```text
specs/002-multi-tenant-auth/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões D1–D12
├── data-model.md        # Fase 1 — tabelas, regras, revogações
├── quickstart.md        # Fase 1 — roteiro de aceite
├── contracts/
│   ├── auth.md          # login, logout, me, troca de senha
│   ├── users.md         # gestão de pessoas pelo ADMIN
│   └── provisioning-cli.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 — criado por /speckit-tasks
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts        # /auth/login, logout, me, change-password
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts             # token → sessão → usuário → empresa, a cada requisição
│   │   ├── roles.guard.ts + roles.decorator.ts
│   │   ├── current-auth.decorator.ts # AuthContext { userId, companyId, role, sessionId }
│   │   ├── password.ts               # scrypt (D2)
│   │   ├── session-token.ts          # geração + SHA-256 (D1)
│   │   ├── sessions.repository.ts
│   │   ├── login-throttle.repository.ts
│   │   └── dto/
│   ├── users/
│   │   ├── users.controller.ts       # /users
│   │   ├── users.service.ts          # último ADMIN, revogações
│   │   ├── users.repository.ts       # companyId obrigatório em toda função (D7)
│   │   └── dto/
│   ├── companies/
│   │   └── companies.repository.ts
│   ├── provisioning/
│   │   └── cli.ts                    # company:create|activate|deactivate|list (D9)
│   ├── database/
│   │   ├── models/                   # Company, User, Session, LoginThrottle
│   │   └── migrations/               # drop _foundation_check; create auth tables
│   └── common/
│       └── api-error.ts              # formato { statusCode, code, message }
└── test/
    ├── setup/                        # banco vemvan_test: cria, migra, limpa (recusa sem _test)
    ├── factories.ts                  # empresas e usuários de teste
    └── *.e2e-spec.ts                 # auth, users, isolation, revocation, throttle

apps/admin/src/
├── proxy.ts                          # checagem otimista de cookie (Next 16)
├── lib/
│   ├── api.ts                        # fetch servidor → API com Bearer
│   └── session.ts                    # verifySession() com React.cache (DAL)
├── app/
│   ├── login/page.tsx
│   ├── change-password/page.tsx
│   └── (panel)/                      # layout protegido
│       ├── page.tsx                  # início: empresa + usuário
│       └── users/page.tsx, users/new/page.tsx, users/[id]/page.tsx
└── features/
    ├── auth/{login,change-password}/ # View + ViewModel + Binder + server actions
    └── users/{list,form}/

apps/mobile/src/
├── lib/
│   ├── api.ts                        # fetch com Bearer
│   └── session-store.ts              # expo-secure-store
├── app/
│   ├── _layout.tsx                   # Stack.Protected por estado de sessão
│   ├── login.tsx
│   ├── change-password.tsx
│   └── index.tsx                     # início protegido
└── features/
    ├── auth/{session,login,change-password}/
    └── home/

packages/shared/src/
└── index.ts                          # + Role, ROLES, AuthUser, LoginResponse, UserSummary (D11)
```

**Structure Decision**: mantém o monorepo da feature 001. A API ganha módulos por contexto (`auth`,
`users`, `companies`, `provisioning`), cada um com controller, service e repository só onde há
lógica: `companies` tem apenas repository, porque não expõe HTTP nesta feature. Admin e Mobile
passam a ter `src/features/`, onde vivem View, ViewModel e Binder, enquanto `src/app/` fica só com
rotas (feature 001, D9; Constitution, Princípio V).

### Scripts e configuração novos

| Item | Onde | Para quê |
|------|------|----------|
| `npm run company:create` / `company:activate` / `company:deactivate` / `company:list` | raiz → `apps/api` | Provisionamento (D9) |
| `npm run test:e2e --workspace apps/api` | `apps/api` | Testes de risco (D10) |
| `API_URL` | `apps/admin/.env.example` | URL da API, só no servidor do Next (D3) |
| `EXPO_PUBLIC_API_URL` | `apps/mobile/.env.example` | URL da API para o app (D4) |
| `TEST_DB_NAME` (default `vemvan_test`) | `apps/api/.env.example` | Banco dos testes e2e (D10) |

## Complexity Tracking

Nenhuma violação da Constitution a justificar.

Para registro, dois pontos com custo de manutenção:

| Item | Por que existe | Alternativa mais simples rejeitada porque |
|------|----------------|-------------------------------------------|
| Consulta ao banco por requisição autenticada (D1) | Única forma de a desativação valer na **próxima** interação (FR-015, FR-016a) | JWT stateless não revoga antes de expirar; com lista de bloqueio, também consulta a cada requisição, e com mais código |
| Banco `vemvan_test` separado (D10) | Os testes de isolamento precisam de PostgreSQL real e não podem sujar nem migrar o banco de desenvolvimento | Mocks do Sequelize não provam isolamento de consulta; SQLite em memória diverge do PostgreSQL em enums, UUID e locks |
