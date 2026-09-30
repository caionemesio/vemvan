---

description: "Task list for Project Foundation"
---

# Tasks: Project Foundation

**Input**: Design documents from `/specs/001-project-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Nenhuma task de teste automatizado. A spec (seção *Assumptions*) e o Complexity Tracking
do plano registram que esta feature não tem comportamento de negócio a testar; a validação é a
execução do `quickstart.md`. Testes automatizados entram na primeira feature com regra de negócio.

**Organization**: Tasks agrupadas por user story, na ordem de prioridade da spec. Cada story é
implementável e validável de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story correspondente (US1–US5)
- Caminhos de arquivo são relativos à raiz do repositório

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Esqueleto do repositório. Nada de aplicação ainda.

- [x] T001 ~~Inicializar o repositório git~~ — já feito: repositório em `/Users/caionemesio/Projects/Personal/vemvan`, branch `main`, com a constitution e a spec já commitadas
- [X] T002 Criar `package.json` na raiz com `"private": true`, `"workspaces": ["apps/*", "packages/*"]` e `"engines": { "node": ">=22" }` (research.md D1)
- [X] T003 [P] Criar `.nvmrc` na raiz fixando Node 22 LTS
- [X] T004 [P] Criar `.gitignore` na raiz cobrindo `node_modules/`, `dist/`, `.next/`, `.expo/`, `*.env` e mantendo `!*.env.example` (FR-020)
- [X] T005 [P] Criar os diretórios `apps/` e `packages/` conforme a árvore do plan.md
- [X] T006 Verificar que `git status --porcelain --ignored` não lista nenhum arquivo com credencial (SC-007, primeira verificação)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Configuração de TypeScript que todos os pacotes estendem.

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase.

- [X] T007 Criar `tsconfig.base.json` na raiz com `strict: true`, target/lib compatíveis com Node 22 e as opções comuns aos 4 pacotes (Constitution, Princípio III)
- [X] T008 Adicionar ao `package.json` da raiz o esqueleto dos scripts que serão preenchidos por story: `dev:api`, `dev:admin`, `dev:mobile`, `db:up`, `db:down`, `db:migrate`, `db:migrate:undo`, `build:shared`, `typecheck`, `build` (FR-003; a tabela de scripts está no plan.md) — **parcial**: criados apenas `dev:api`, `db:up`, `db:down`, `db:migrate`, `db:migrate:undo`. Os demais entram com suas stories (T032, T036, T042, T049, T050), para não deixar scripts apontando para workspaces inexistentes

---

## Phase 3: User Story 1 — API conectada ao PostgreSQL local (Priority: P1) 🎯 MVP

**Goal**: Subir o banco local, rodar migrations e iniciar a API com conexão comprovada.

**Independent Test**: Executar os passos 2 a 6 do `quickstart.md` — sem Admin, sem Mobile e sem o
package compartilhado.

### Banco de dados local

- [X] T009 [US1] Criar `docker-compose.yml` na raiz com serviço `postgres` (imagem PostgreSQL 16) e **volume nomeado** para persistência (FR-012), mapeando `DB_USER`/`DB_PASSWORD`/`DB_NAME` para as variáveis `POSTGRES_*` que a imagem exige e publicando a porta como **`${DB_PORT}:5432`** — é o que permite contornar conflito de porta na máquina alterando apenas `apps/api/.env`, sem editar arquivo versionado (edge case da spec)
- [X] T010 [US1] Definir `db:up` no `package.json` da raiz como `docker compose --env-file apps/api/.env up -d` e `db:down` como `docker compose --env-file apps/api/.env down` (research.md D6 — `env_file:` no serviço NÃO funciona para interpolação; e `down` sem `-v` para preservar o volume)

### Scaffolding da API

- [X] T011 [US1] Gerar a aplicação NestJS em `apps/api/` com a CLI oficial (`nest new`), TypeScript, e ajustar `apps/api/tsconfig.json` para estender `tsconfig.base.json`
- [X] T011a [US1] Reconciliar o scaffold com o workspace: remover `apps/api/package-lock.json` e `apps/api/node_modules/` criados pela CLI e rodar `npm install` na raiz, para que a resolução volte a ser hoisted (research.md D1)
- [X] T012 [US1] Registrar em `research.md` (seção D7) as versões efetivamente instaladas de NestJS, Sequelize e Node
- [X] T013 [US1] Instalar em `apps/api/` as dependências `@nestjs/sequelize`, `sequelize`, `pg`, `@nestjs/config` e `umzug` (research.md D3, D4)
- [X] T014 [US1] Definir `dev:api` no `package.json` da raiz apontando para o modo watch do workspace `apps/api`

### Configuração por ambiente

- [X] T015 [US1] Criar `apps/api/.env.example` versionado, documentando `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `DB_SSL`, **sem nenhuma credencial real** (FR-018)
- [X] T016 [US1] Implementar `apps/api/src/config/` com `@nestjs/config` e validação de schema que **falha no startup** quando faltar variável obrigatória, nomeando a variável ausente (research.md D8, edge case da spec)

### Sequelize e falha rápida

- [X] T017 [US1] Implementar `apps/api/src/database/database.module.ts` com `SequelizeModule.forRootAsync`, lendo a configuração do módulo de config e definindo explicitamente `synchronize: false` (FR-007), `autoLoadModels: false` (FR-023) e **`retryAttempts: 0`** (FR-005)
- [X] T018 [US1] Verificar manualmente que, com o banco parado, `npm run dev:api` encerra em poucos segundos com erro explícito — e não após ~30s de tentativas (research.md D3; passo 5 do quickstart.md)

### Migrations

- [X] T019 [US1] Implementar o runner Umzug em `apps/api/src/database/migrator.ts` com `SequelizeStorage`, apontando para `apps/api/src/database/migrations/` e expondo as operações de `up` e `down` (research.md D4)
- [X] T020 [US1] Definir `db:migrate` e `db:migrate:undo` no `package.json` da raiz, acionando o runner de T019
- [X] T021 [US1] Criar a única migration técnica em `apps/api/src/database/migrations/`, criando a tabela descartável `_foundation_check` (`id`, `created_at`) no `up` e removendo-a no `down` (FR-009, data-model.md T2)
- [X] T022 [US1] Verificar o ciclo completo: `db:migrate` cria a tabela e insere 1 linha em `SequelizeMeta`; `db:migrate` de novo é idempotente; `db:migrate:undo` remove a tabela e esvazia `SequelizeMeta` (SC-004)

### Endpoint de saúde

- [X] T023 [US1] Implementar `apps/api/src/health/health.controller.ts` e `health.module.ts` expondo `GET /health`, executando `sequelize.authenticate()` **a cada chamada** e respondendo `200`/`503` conforme `contracts/health.md`
- [X] T024 [US1] Verificar que a resposta de `/health` contém apenas `status` e `database`, sem host, usuário, nome do banco ou stack trace (`contracts/health.md`)
- [X] T025 [US1] Registrar `DatabaseModule`, `ConfigModule` e `HealthModule` em `apps/api/src/app.module.ts` e confirmar que `GET /health` é a **única** rota da aplicação (SC-008)

**Checkpoint**: os passos 2 a 6 do `quickstart.md` passam. Esta é a fatia mínima entregável.

---

## Phase 4: User Story 2 — Painel Admin inicial no ar (Priority: P2)

**Goal**: Admin sobe e apresenta uma página inicial estilizada do VemVan.

**Independent Test**: Passo 7 do `quickstart.md`, com banco e API desligados.

- [ ] T026 [US2] Gerar a aplicação Next.js em `apps/admin/` com `create-next-app` (TypeScript, Tailwind CSS, App Router) e ajustar `apps/admin/tsconfig.json` para estender `tsconfig.base.json`
- [ ] T026a [US2] Reconciliar o scaffold com o workspace: remover `apps/admin/package-lock.json` e `apps/admin/node_modules/` criados pela CLI e rodar `npm install` na raiz (research.md D1)
- [ ] T027 [US2] Registrar em `research.md` (seção D7) a versão do Next.js e **a versão do Tailwind instalada** — v4 configura por CSS (`@import "tailwindcss"`), v3 por `tailwind.config.js`; o resto da story depende de qual foi
- [ ] T028 [US2] Inicializar o shadcn/ui em `apps/admin/` seguindo a documentação correspondente à versão do Tailwind identificada em T027, gerando `src/components/ui/` e `src/lib/utils.ts`
- [ ] T029 [US2] Adicionar ao menos um componente do shadcn/ui em `apps/admin/src/components/ui/` (ex.: `button`) via CLI do shadcn
- [ ] T030 [US2] Implementar a página inicial estática em `apps/admin/src/app/page.tsx` identificando o VemVan, usando o componente de T029 e classes do Tailwind — evidência de que ambos estão funcionais (FR-014)
- [ ] T031 [US2] Manter a página inicial **sem View/ViewModel/Binder**: é uma tela estática de validação (FR-026, Constitution Princípio V)
- [ ] T032 [US2] Definir `dev:admin` no `package.json` da raiz iniciando o Admin na **porta 3001**, para não colidir com a API (plan.md, tabela de scripts)

**Checkpoint**: passo 7 do `quickstart.md` passa.

---

## Phase 5: User Story 3 — Aplicativo Mobile inicial no ar (Priority: P3)

**Goal**: Mobile sobe e apresenta a tela inicial do VemVan em pelo menos um alvo.

**Independent Test**: Passo 8 do `quickstart.md`, isoladamente.

- [ ] T033 [US3] Gerar a aplicação Expo em `apps/mobile/` com `create-expo-app` usando o **template padrão com TypeScript**, que já inclui `expo-router` (research.md D9), e ajustar `apps/mobile/tsconfig.json` para estender `tsconfig.base.json`
- [ ] T033a [US3] Reconciliar o scaffold com o workspace: remover `apps/mobile/package-lock.json` e `apps/mobile/node_modules/` criados pela CLI e rodar `npm install` na raiz (research.md D1)
- [ ] T034 [US3] Configurar `apps/mobile/metro.config.js` para o monorepo: `watchFolders` incluindo a raiz e `nodeModulesPaths` cobrindo o `node_modules` da raiz e o do app (research.md D1)
- [ ] T035 [US3] Implementar a tela inicial estática em `apps/mobile/app/index.tsx`, sob o layout raiz `apps/mobile/app/_layout.tsx`, indicando que o VemVan está funcionando, sem MVVM (FR-026)
- [ ] T036 [US3] Definir `dev:mobile` no `package.json` da raiz iniciando o servidor de desenvolvimento do Expo
- [ ] T037 [US3] Verificar que `apps/mobile/package.json` **não** contém `react-native-maps`, `expo-location`, `expo-notifications` nem `socket.io-client` (FR-025). O `expo-router` e suas dependências de suporte são esperados, por decisão D9
- [ ] T038 [US3] Abrir o app em ao menos um alvo (emulador, dispositivo ou navegador) e confirmar a tela — compilar o bundle não basta (decisão de clarify nº 5)

**Checkpoint**: passo 8 do `quickstart.md` passa.

---

## Phase 6: User Story 4 — Package compartilhado disponível (Priority: P4)

**Goal**: `packages/shared` importável pelas aplicações, com tipos resolvendo.

**Independent Test**: Importar o export trivial em uma aplicação e rodar a verificação de tipos.

**Depende de**: ao menos uma aplicação existir (US1 ou US2), para haver onde verificar a importação.

- [ ] T039 [US4] Criar `packages/shared/package.json` com nome `@vemvan/shared`, `main: dist/index.js`, `types: dist/index.d.ts` e script `build` com `tsc` (research.md D2)
- [ ] T040 [US4] Criar `packages/shared/tsconfig.json` estendendo `tsconfig.base.json`, com `declaration: true` e saída em `dist/`
- [ ] T041 [US4] Implementar `packages/shared/src/index.ts` com um único export trivial e **sem domínio** — nada de `UserRole`, `TripStatus`, DTOs ou enums de negócio (FR-017, data-model.md)
- [ ] T042 [US4] Definir `build:shared` no `package.json` da raiz compilando `packages/shared` para `dist/`
- [ ] T043 [US4] Adicionar `@vemvan/shared` como dependência de `apps/api` e verificar que a importação resolve em runtime e na verificação de tipos (FR-016)
- [ ] T044 [US4] Verificar a mesma importação em `apps/admin` e, se US3 estiver concluída, confirmar que o Metro também resolve o package em `apps/mobile`

**Checkpoint**: `npm run build:shared` seguido de `npm run typecheck` passa em todos os pacotes.

---

## Phase 7: User Story 5 — Onboarding documentado (Priority: P5)

**Goal**: Outra pessoa vai do clone ao ambiente rodando usando apenas o README.

**Independent Test**: Passo 12 do `quickstart.md`, idealmente executado por outra pessoa em máquina limpa.

**Depende de**: US1 a US4, porque documenta o que elas entregam.

- [ ] T045 [US5] Escrever `README.md` na raiz com a sequência completa: clonar, instalar dependências, copiar `apps/api/.env.example` para `.env`, subir o banco, rodar migrations, iniciar API, Admin e Mobile (FR-021)
- [ ] T046 [US5] Documentar no `README.md` que `apps/api/.env` é a fonte única das credenciais, consumida também pelo Docker Compose via `--env-file` (FR-019)
- [ ] T047 [US5] [P] Escrever `CLAUDE.md` na raiz com as regras operacionais do repositório (estrutura, scripts, restrições de stack), **referenciando** `.specify/memory/constitution.md` como fonte de verdade e sem duplicar seu conteúdo nem o do README (FR-022)
- [ ] T048 [US5] Confirmar que `apps/admin` e `apps/mobile` **não** têm arquivo de ambiente, por não consumirem configuração nesta feature (research.md D8)

**Checkpoint**: passo 12 do `quickstart.md` passa.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Fechar os critérios de sucesso que atravessam todas as stories.

- [ ] T049 Preencher `typecheck` no `package.json` da raiz agregando a verificação de tipos dos 4 pacotes (SC-006)
- [ ] T050 Preencher `build` no `package.json` da raiz encadeando `shared` → `api` → `admin`, respeitando a ordem exigida por research.md D2 (SC-006)
- [ ] T051 Verificar a portabilidade do banco: apontar `apps/api/.env` para outro PostgreSQL e confirmar que a API funciona com **0 arquivos de código alterados** (SC-005, FR-011)
- [ ] T052 Auditar o escopo (SC-008): 0 entidades de domínio, 0 rotas além de `GET /health`, 0 dependências de mapas/localização/notificações/realtime em qualquer `package.json`, `packages/shared` sem domínio, telas sem MVVM
- [ ] T053 Confirmar a ausência de Prisma e de qualquer chamada a `sequelize.sync()` em todo o repositório (FR-006, FR-007)
- [ ] T054 Executar o `quickstart.md` inteiro, do passo 1 ao 12, em sequência e sem pular os cenários negativos dos passos 5 e 6

---

## Dependencies

```
Phase 1 (Setup)
   ↓
Phase 2 (Foundational — tsconfig.base)
   ↓
   ├─→ US1 (P1) ──┐
   ├─→ US2 (P2) ──┤
   └─→ US3 (P3) ──┤
                  ↓
                 US4 (P4)   ← precisa de ≥1 app para verificar a importação
                  ↓
                 US5 (P5)   ← documenta o que as anteriores entregam
                  ↓
              Phase 8 (Polish)
```

**Independência real**: US1, US2 e US3 não dependem entre si e podem ser feitas em qualquer ordem
ou em paralelo. US4 precisa apenas de uma aplicação existente. US5 é a única que depende de todas.

## Parallel Execution Examples

**Phase 1** — após T002:

```
T003 (.nvmrc)  ‖  T004 (.gitignore)  ‖  T005 (diretórios)
```

**Entre stories** — após a Phase 2, três pessoas (ou três sessões) podem tocar:

```
Pessoa A: US1 (T009–T025, inclui T011a)  — API e banco
Pessoa B: US2 (T026–T032, inclui T026a)  — Admin
Pessoa C: US3 (T033–T038, inclui T033a)  — Mobile
```

**Dentro da US1**: T009/T010 (Docker) são independentes de T011–T014 (scaffolding do Nest) e podem
avançar em paralelo. A partir de T015 a ordem é sequencial, porque config → Sequelize → migrations →
health formam uma cadeia.

## Implementation Strategy

**MVP = User Story 1.** Concluir T001–T025 (com T011a) já entrega a fatia que carrega todo o risco técnico da
feature (workspace, banco, ORM, migrations, configuração por ambiente) e desbloqueia a próxima
feature de backend. Vale parar aqui e validar antes de seguir.

**Incremento 2**: US2 e US3 em paralelo — desbloqueiam as features de painel e de app.

**Incremento 3**: US4 e US5 fecham a fundação e a tornam verificável por outra pessoa.

**Ordem de risco** (onde a implementação tem maior chance de travar):

1. **T028** — shadcn/ui sobre Tailwind v4 tem init e tokens diferentes da v3. Fazer T027 antes é o
   que evita seguir a documentação errada.
2. **T017/T018** — `retryAttempts: 0` é o detalhe que faz a falha rápida acontecer de verdade.
3. **T034** — configuração do Metro em monorepo é a origem clássica de erro de resolução no RN.
4. **T010** — usar `env_file:` em vez de `--env-file` faz a interpolação falhar silenciosamente.
5. **T011a/T026a/T033a** — as CLIs de scaffold rodam install próprio dentro de `apps/*`. Deixar o
   `package-lock.json` do app para trás quebra o hoisting do npm workspaces e produz erros de
   resolução difíceis de diagnosticar depois.
