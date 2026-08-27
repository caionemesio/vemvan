# Quickstart — Validação da Project Foundation

**Feature**: 001-project-foundation | **Date**: 2026-08-27

Roteiro de validação da feature. Cada seção mapeia para critérios de sucesso da spec. A feature só
está concluída quando todas as verificações passarem em uma máquina limpa.

O `README.md` entregue pela feature é a versão voltada ao onboarding; este documento é a versão
voltada à **verificação de aceite** e inclui os cenários negativos.

## Pré-requisitos

- Node 22 LTS (ver `.nvmrc`)
- Docker em execução
- Um alvo para o Mobile: emulador, dispositivo físico com Expo Go, ou navegador

---

## 1. Instalação — SC-002

```bash
npm install          # instala todos os workspaces
npm run build:shared # packages/shared → dist/ (ver research.md D2)
```

**Esperado**: instalação sem erro. `packages/shared/dist/index.js` e `index.d.ts` existem.

---

## 2. Banco local — SC-002

```bash
cp apps/api/.env.example apps/api/.env   # ajustar valores se necessário
npm run db:up
```

**Esperado**: contêiner `postgres` no ar, credenciais vindas de `apps/api/.env` (research.md D6).

Verificação de persistência (FR-012):

```bash
npm run db:down && npm run db:up
```

**Esperado**: os dados sobrevivem ao ciclo — o volume nomeado não é descartado.

---

## 3. Migrations — SC-004

```bash
npm run db:migrate
```

**Esperado**: `_foundation_check` existe no banco e `SequelizeMeta` tem 1 linha.

```bash
npm run db:migrate   # de novo
```

**Esperado**: nenhuma migration reaplicada, sem erro (idempotência).

```bash
npm run db:migrate:undo
```

**Esperado**: `_foundation_check` não existe mais e `SequelizeMeta` está vazia. Ver `data-model.md`.

Reaplicar antes de seguir: `npm run db:migrate`.

---

## 4. API com o banco no ar — SC-003

```bash
npm run dev:api
curl -i http://localhost:3000/health
```

**Esperado**: `200` com `{"status":"ok","database":"connected"}`. Ver `contracts/health.md`.

---

## 5. API com o banco fora — SC-003 (cenário negativo)

**Esta é a verificação mais fácil de esquecer e a que prova a decisão de falha rápida.**

```bash
npm run db:down
npm run dev:api
```

**Esperado**: a API **encerra durante a inicialização**, com erro explícito de conexão, em poucos
segundos. Não pode subir em estado degradado, nem ficar ~30s tentando reconectar — se isso
acontecer, `retryAttempts` não foi zerado (research.md D3).

Variação — variável obrigatória ausente:

```bash
npm run db:up
# remover temporariamente DB_PASSWORD de apps/api/.env
npm run dev:api
```

**Esperado**: falha no startup nomeando a variável faltante (research.md D8). Restaurar o `.env`
depois.

---

## 6. Portabilidade do banco — SC-005

Apontar `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `DB_SSL` em `apps/api/.env`
para qualquer outro PostgreSQL, subir a API e chamar `/health`.

**Esperado**: funciona sem alterar **nenhum** arquivo de código. É o que garante que trocar o
provedor (inclusive o PostgreSQL do Supabase) seja mudança de configuração, não de código
(FR-011).

---

## 7. Admin — SC-002

```bash
npm run dev:admin
```

Abrir `http://localhost:3001`.

**Esperado**: página inicial do VemVan, estilos do Tailwind aplicados e ao menos um componente do
shadcn/ui renderizado — a evidência de que a biblioteca está funcional, não só instalada (FR-014).

---

## 8. Mobile — SC-002

```bash
npm run dev:mobile
```

Abrir o app em um alvo à escolha.

**Esperado**: tela inicial simples indicando que o VemVan está funcionando. Compilar o bundle sem
abrir o app **não** conta como validado (decisão de clarify nº 5).

---

## 9. Tipos e build — SC-006

```bash
npm run typecheck   # shared + api + admin + mobile
npm run build       # shared + api + admin
```

**Esperado**: 0 erros originados da configuração criada.

---

## 10. Higiene do repositório — SC-007

```bash
git status --porcelain --ignored | grep -E '\.env$|node_modules|dist|\.next'
```

**Esperado**: todos ignorados. Nenhum `.env` com credencial versionado; apenas os `.env.example`
(FR-018, FR-020).

---

## 11. Escopo — SC-008

Verificação por inspeção, não automatizada:

- 0 entidades de domínio (`data-model.md`)
- 0 rotas além de `GET /health` (`contracts/health.md`)
- 0 dependências de mapas, localização, notificações ou realtime em qualquer `package.json`
  (FR-025)
- `packages/shared` sem tipos de domínio (FR-017)
- Telas do Admin e do Mobile estáticas, sem ViewModel nem Binder (FR-026)

---

## 12. Onboarding — SC-001

Idealmente executado por **outra pessoa**, em máquina limpa, seguindo apenas o `README.md`: do clone
até API, Admin e Mobile rodando, em menos de 30 minutos, sem perguntar nada a ninguém.

Qualquer passo em que a pessoa travar é um defeito do README, não dela.
