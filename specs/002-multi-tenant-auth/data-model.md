# Phase 1 — Data Model: Multi-Tenant Auth

**Feature**: 002-multi-tenant-auth | **Date**: 2026-09-30

Primeiras tabelas de domínio do VemVan. Nomes em inglês, `snake_case`, chaves UUID v4, `created_at`
e `updated_at` em todas as tabelas de entidade (research.md D8). O schema nasce de migrations
versionadas; nada de `sync()`.

## Visão geral

```
companies 1 ──< users 1 ──< sessions
login_throttles   (independente — chave é o e-mail, exista ou não o usuário)
```

---

## `companies` — Company

| Coluna | Tipo | Regras |
|--------|------|--------|
| `id` | uuid, PK | gerado |
| `name` | varchar(120), not null | aparado; 2–120 caracteres |
| `status` | enum `company_status` (`ACTIVE`, `INACTIVE`), not null | default `ACTIVE` |
| `created_at`, `updated_at` | timestamptz, not null | |

**Transições de `status`**: `ACTIVE ⇄ INACTIVE`, somente pelo CLI de provisionamento
(FR-002a). `ACTIVE → INACTIVE` revoga todas as sessões abertas dos usuários da empresa.

**Nota**: `companies` é a raiz do tenant — é a única tabela de domínio sem `company_id`.

---

## `users` — User

| Coluna | Tipo | Regras |
|--------|------|--------|
| `id` | uuid, PK | gerado |
| `company_id` | uuid, FK → `companies.id`, not null, `ON DELETE RESTRICT` | nunca vem do cliente (FR-017) |
| `name` | varchar(120), not null | aparado; 2–120 caracteres |
| `email` | varchar(254), not null, **UNIQUE global** | armazenado já normalizado: `trim` + minúsculas (FR-004) |
| `role` | enum `user_role` (`ADMIN`, `DRIVER`, `PASSENGER`), not null | `USER` não existe (FR-003) |
| `status` | enum `user_status` (`ACTIVE`, `INACTIVE`), not null | default `ACTIVE` |
| `password_hash` | varchar(255), not null | formato `scrypt$N$r$p$salt$hash` (research.md D2); nunca serializado |
| `must_change_password` | boolean, not null | `true` na criação e após redefinição pelo ADMIN (FR-008a, FR-016) |
| `password_changed_at` | timestamptz, null | última troca feita pelo próprio usuário |
| `created_at`, `updated_at` | timestamptz, not null | |

**Índices**: `UNIQUE (email)`; `(company_id, name)` para a listagem da empresa.

**Regras**:
- Senha (inicial, provisória ou nova): mínimo 8 caracteres (FR-008b). Senha nova ≠ senha atual
  (FR-008a).
- Nenhuma linha é apagada; desativar = `status = INACTIVE` (FR-006).
- **Último ADMIN ativo** (FR-007): uma operação que tire o último `ADMIN` `ACTIVE` da empresa —
  desativar esse usuário ou trocar o role dele — é recusada. A checagem conta os ADMINs ativos da
  empresa **dentro da mesma transação** da alteração, com bloqueio das linhas envolvidas, para que
  dois ADMINs não se desativem mutuamente ao mesmo tempo.

**Transições de `status`**: `ACTIVE ⇄ INACTIVE` pelo ADMIN da mesma empresa. `ACTIVE → INACTIVE`
revoga as sessões abertas do usuário.

---

## `sessions` — Session

| Coluna | Tipo | Regras |
|--------|------|--------|
| `id` | uuid, PK | gerado |
| `user_id` | uuid, FK → `users.id`, not null, `ON DELETE RESTRICT` | |
| `token_hash` | char(64), not null, **UNIQUE** | SHA-256 hex do token; o token em si nunca é gravado (research.md D1) |
| `client` | enum `session_client` (`ADMIN_PANEL`, `MOBILE_APP`), not null | define o prazo e a origem |
| `expires_at` | timestamptz, not null | criação + 8 h (`ADMIN_PANEL`) ou + 30 dias (`MOBILE_APP`) (FR-014) |
| `revoked_at` | timestamptz, null | preenchido em logout, desativação, redefinição de senha |
| `created_at` | timestamptz, not null | |

**Índice**: `UNIQUE (token_hash)`; `(user_id) WHERE revoked_at IS NULL` para revogação em massa.

**Sessão válida** = `revoked_at IS NULL` **e** `expires_at > now()` **e** usuário `ACTIVE` **e**
empresa `ACTIVE`. Avaliada a cada requisição, lendo o estado atual (FR-015).

**Por que sem `company_id`**: a empresa da sessão é sempre a do usuário, lida por join. Copiar o
valor criaria uma segunda fonte que poderia divergir.

**Revogações**:

| Evento | Sessões revogadas |
|--------|-------------------|
| Logout | a sessão corrente |
| Usuário desativado | todas do usuário |
| Senha redefinida pelo ADMIN | todas do usuário (FR-016a) |
| Senha trocada pelo próprio usuário | todas do usuário **exceto a corrente** |
| Empresa desativada | todas dos usuários da empresa |

A revogação é explícita além da checagem de `status`: se o usuário ou a empresa forem reativados,
as sessões antigas **não** voltam a valer.

---

## `login_throttles` — bloqueio de tentativas

| Coluna | Tipo | Regras |
|--------|------|--------|
| `email` | varchar(254), PK | e-mail normalizado, exista ou não um usuário |
| `failed_count` | integer, not null | 0–4 |
| `locked_until` | timestamptz, null | agora + 15 min ao atingir 5 falhas (FR-012) |
| `updated_at` | timestamptz, not null | |

Sucesso no login apaga a linha. Não é entidade de negócio: não pertence a empresa, porque deve
existir também para e-mails inexistentes (research.md D5).

---

## Migrations desta feature

1. **Remover `_foundation_check`** — a tabela descartável da feature 001 sai na primeira migration
  de domínio, como registrado lá (`specs/001-project-foundation/data-model.md`). O `down` a recria.
2. **Criar `companies`, `users`, `sessions`, `login_throttles`** e os tipos enum, em uma migration;
  o `down` remove na ordem inversa.

As duas são aplicadas pelo usuário com `npm run db:migrate` (bloqueado para agentes). O banco de
testes `vemvan_test` é migrado pelo setup dos testes e2e (research.md D10).

## Contratos compartilhados (`packages/shared`)

Tipos que espelham as respostas públicas da API, para Admin e Mobile (research.md D11). **Nunca**
incluem `password_hash`, `token_hash` nem qualquer dado de sessão além do necessário.

| Tipo | Campos |
|------|--------|
| `Role` | `'ADMIN' \| 'DRIVER' \| 'PASSENGER'` (+ `ROLES` como lista) |
| `AuthUser` | `id`, `name`, `email`, `role`, `mustChangePassword`, `company: { id, name }` |
| `LoginResponse` | `token`, `expiresAt`, `user: AuthUser` |
| `UserSummary` | `id`, `name`, `email`, `role`, `status` (`'ACTIVE' \| 'INACTIVE'`), `createdAt` |
