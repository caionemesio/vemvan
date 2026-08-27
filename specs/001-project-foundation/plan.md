# Implementation Plan: Project Foundation

**Branch**: `001-project-foundation` | **Date**: 2026-08-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-project-foundation/spec.md`

## Summary

Entregar a fundação técnica do monorepo VemVan: npm workspaces com três aplicações (API NestJS,
Admin Next.js, Mobile Expo) e um package compartilhado, PostgreSQL local via Docker Compose,
Sequelize com migrations versionadas em TypeScript via Umzug, e documentação de onboarding.

Nenhuma regra de negócio, entidade de domínio ou autenticação. A API expõe exatamente uma rota
(`GET /health`) cuja única função é tornar verificável que a conexão com o banco existe.

A abordagem técnica está detalhada em [research.md](./research.md) (decisões D1–D9). Os dois pontos
com maior risco de atrito na implementação são a configuração do Tailwind v4 + shadcn/ui (D7) e o
encadeamento do build do `packages/shared` (D2).

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node 22 LTS (fixado em `.nvmrc` e `engines`)

**Primary Dependencies**: NestJS + `@nestjs/sequelize` + `@nestjs/config`, Sequelize v6 + `pg`,
Umzug v3, Next.js + Tailwind CSS + shadcn/ui, Expo + React Native com `expo-router` (D9). Versões exatas definidas pelas CLIs oficiais na implementação e fixadas no
lockfile (D7).

**Storage**: PostgreSQL 16 via Docker Compose em desenvolvimento local. Sem modelos de domínio;
apenas `SequelizeMeta` e a tabela descartável `_foundation_check` (ver [data-model.md](./data-model.md)).

**Testing**: Nenhum teste automatizado nesta feature — não há comportamento de negócio a testar.
A verificação é a execução do [quickstart.md](./quickstart.md). Ver Complexity Tracking.

**Target Platform**: API e Admin em ambiente local de desenvolvimento (Node/navegador); Mobile em
emulador, dispositivo físico ou navegador, à escolha de quem valida.

**Project Type**: Monorepo — API + web app + mobile app + package compartilhado.

**Performance Goals**: Não se aplica. Não há tráfego, carga ou latência a otimizar. A única métrica
temporal da spec é de onboarding humano (SC-001: < 30 min do clone ao ambiente rodando).

**Constraints**:
- Schema exclusivamente por migrations versionadas; `sequelize.sync()` proibido (FR-007).
- Prisma proibido (FR-006).
- Código independente de provedor de PostgreSQL: trocar de banco = trocar variáveis de ambiente,
  0 arquivos de código alterados (FR-011, SC-005).
- Falha rápida no boot quando o banco não responde (FR-005).
- Sem bibliotecas de mapas, localização, notificações ou realtime (FR-025).

**Scale/Scope**: 4 pacotes no workspace, 1 rota HTTP, 1 migration, 2 telas estáticas, 0 entidades
de domínio.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Status | Avaliação |
|-----------|--------|-----------|
| I. Spec antes da implementação | ✅ PASS | Spec escrita, 5 pontos clarificados e integrados, plano precede o código. Escopo travado por FR-023 a FR-026. |
| II. Escopo mínimo e simplicidade | ✅ PASS | npm workspaces sem Turborepo/Nx (D1); sem `@nestjs/terminus` (D5); sem repositories nem camadas vazias; `.env` só onde há configuração real (D8); `shared` sem tipos de domínio (FR-017). Cada dependência nova está justificada em `research.md`. |
| III. TypeScript e idioma do código | ✅ PASS | TypeScript nos 4 pacotes, inclusive nas migrations — motivo direto da escolha do Umzug sobre `sequelize-cli` (D4). Código e nomes em inglês; textos de tela em português. |
| IV. Multi-tenant e autorização | ✅ PASS (parcialmente não aplicável) | Sem entidades, sem `companyId`, sem roles e sem autenticação nesta feature. O que se aplica hoje é cumprido: segredos apenas em variáveis de ambiente, `.env` fora do versionamento, `.env.example` sem credenciais reais, frontend sem acesso ao banco, `/health` sem vazar topologia (`contracts/health.md`). |
| V. Camadas explícitas sem burocracia | ✅ PASS | API com um controller mínimo e nenhum service/repository — não há persistência de domínio para justificá-los. MVVM não é aplicado às telas estáticas (FR-026), conforme a própria Constitution. |
| VI. Integridade do modelo de domínio | ✅ N/A | Nenhum domínio é modelado. Route, Trip e TripPassenger não existem nesta feature. |
| VII. Testes guiados por risco | ⚠️ PASS com desvio | Sem testes automatizados. Ver Complexity Tracking. |

**Resultado pré-Fase 0**: aprovado, 1 desvio registrado.

**Reavaliação pós-Fase 1**: aprovado, sem novas violações. O design da Fase 1 não introduziu
camadas, dependências nem abstrações além das listadas em `research.md`. O único artefato novo com
custo de manutenção é a tabela descartável `_foundation_check`, registrada abaixo com data de
remoção.

## Project Structure

### Documentation (this feature)

```text
specs/001-project-foundation/
├── plan.md              # Este arquivo
├── research.md          # Fase 0 — decisões D1–D8
├── data-model.md        # Fase 1 — estruturas técnicas, zero domínio
├── quickstart.md        # Fase 1 — roteiro de validação de aceite
├── contracts/
│   └── health.md        # Fase 1 — contrato de GET /health
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 — criado por /speckit-tasks
```

### Source Code (repository root)

```text
vemvan/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/            # @nestjs/config + validação de schema no startup (D8)
│   │   │   ├── database/
│   │   │   │   ├── migrations/    # migrations .ts versionadas
│   │   │   │   ├── migrator.ts    # runner Umzug (D4)
│   │   │   │   └── database.module.ts
│   │   │   ├── health/
│   │   │   │   ├── health.controller.ts
│   │   │   │   └── health.module.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── .env.example           # versionado, sem credenciais reais
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── admin/
│   │   ├── src/
│   │   │   ├── app/               # App Router — página inicial estática
│   │   │   ├── components/ui/     # componentes do shadcn/ui
│   │   │   └── lib/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── mobile/
│       ├── app/                   # rotas do expo-router (D9)
│       │   ├── _layout.tsx
│       │   └── index.tsx          # tela inicial estática
│       ├── app.json
│       ├── metro.config.js        # configuração de monorepo do Metro (D1)
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── shared/
│       ├── src/index.ts           # export trivial, sem domínio (FR-017)
│       ├── package.json           # main: dist/index.js, types: dist/index.d.ts (D2)
│       └── tsconfig.json
├── docker-compose.yml             # postgres + volume nomeado
├── package.json                   # workspaces + scripts da raiz
├── package-lock.json
├── tsconfig.base.json
├── .nvmrc
├── .gitignore
├── README.md
└── CLAUDE.md
```

**Structure Decision**: monorepo com npm workspaces (D1), exatamente na estrutura proposta pela
spec — `apps/api`, `apps/mobile`, `apps/admin`, `packages/shared` — sem ajustes. Nenhuma
justificativa técnica apareceu para desviar dela.

Três escolhas dentro dessa estrutura merecem registro: as migrations e o runner vivem em
`apps/api/src/database/`, e não na raiz, porque são código da API e devem ser compilados junto com
ela; não existem `.env.example` em `apps/admin` nem em `apps/mobile`, porque nenhuma das duas
consome configuração nesta feature (D8); e o Mobile usa `expo-router`, então a tela inicial estática
fica em `app/index.tsx`, sob o layout raiz `app/_layout.tsx` (D9).

### Scripts da raiz

Nomes definidos aqui (a spec deixou a nomenclatura em aberto em FR-003):

| Script | Ação |
|--------|------|
| `npm run dev:api` | Inicia a API em modo watch |
| `npm run dev:admin` | Inicia o Admin (porta 3001, para não colidir com a API) |
| `npm run dev:mobile` | Inicia o servidor de desenvolvimento do Expo |
| `npm run db:up` | Sobe o PostgreSQL via `docker compose --env-file apps/api/.env up -d` (D6) |
| `npm run db:down` | Para o contêiner, preservando o volume |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:migrate:undo` | Reverte a última migration |
| `npm run build:shared` | Compila `packages/shared` para `dist/` |
| `npm run typecheck` | Verificação de tipos nos 4 pacotes |
| `npm run build` | Build de `shared`, `api` e `admin` |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Nenhum teste automatizado (Princípio VII) | A feature não contém comportamento de negócio: são configuração, scaffolding e uma rota que reporta conectividade. Um teste aqui verificaria o framework, não o VemVan. A validação é o `quickstart.md`, que cobre inclusive os cenários negativos (banco fora, variável ausente). | Escrever testes de fumaça agora seria cobertura artificial, explicitamente rejeitada pelo Princípio VII. A infraestrutura de testes entra na primeira feature com regra de negócio, junto de algo que valha testar. |
| Tabela `_foundation_check` e sua migration | Sem uma migration com efeito observável no schema não há como provar que aplicar **e reverter** funcionam — SC-004 exige que o banco volte ao estado anterior, o que precisa ser verificável. | Uma migration sem efeito no schema "reverteria" com sucesso sem provar nada; confiar apenas na criação de `SequelizeMeta` não exercita o caminho de `down`. Dívida datada: removida na primeira migration de domínio (`data-model.md`). |
| Passo de build do `packages/shared` (D2) | Consumir JavaScript compilado é a única forma que funciona igual em Nest, Next e Metro sem configuração específica por app. | Exportar o TS-fonte exigiria `transpilePackages` no Next, ajuste de resolver no Metro e contorno de `rootDir` no Nest — três configurações frágeis para o mesmo problema, e a fonte clássica de erros de resolução no React Native. |
