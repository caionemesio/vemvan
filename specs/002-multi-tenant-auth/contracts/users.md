# Contract — Gestão de usuários da empresa

**Feature**: 002-multi-tenant-auth

Todas as rotas exigem sessão válida, `mustChangePassword = false` e role **`ADMIN`**; qualquer outro
role → `403 FORBIDDEN`. Convenções de erro em `auth.md`.

**Isolamento** (FR-017, FR-018): a empresa é sempre a do ADMIN autenticado. `:id` de um usuário de
outra empresa responde **exatamente** como `:id` inexistente: `404 USER_NOT_FOUND`. Nenhum endpoint
aceita `companyId` — se enviado, é descartado.

| `code` | HTTP | Quando |
|--------|------|--------|
| `USER_NOT_FOUND` | 404 | id inexistente **ou de outra empresa** |
| `EMAIL_ALREADY_IN_USE` | 409 | e-mail normalizado já usado por qualquer usuário do sistema (FR-004) |
| `LAST_ADMIN` | 409 | a operação deixaria a empresa sem ADMIN ativo (FR-007) |

`UserSummary`: `{ id, name, email, role, status, createdAt }` (data-model.md).

---

## `GET /users`

**200** — `UserSummary[]` da empresa do ADMIN, ordenados por `name`. Inclui ativos e desativados.
Sem paginação nesta feature (volume de uma empresa cabe numa lista; revisar quando houver dados
reais).

## `GET /users/:id`

**200** — `UserSummary`. **404** `USER_NOT_FOUND`.

## `POST /users`

```json
{ "name": "Bruno", "email": "bruno@empresa.com", "role": "DRIVER", "initialPassword": "********" }
```

- `name`: 2–120 caracteres, aparado.
- `email`: e-mail válido, normalizado.
- `role`: `ADMIN` | `DRIVER` | `PASSENGER`.
- `initialPassword`: 8–200 caracteres (FR-008, FR-008b).

**201** — `UserSummary`, `status = ACTIVE`, criado com `mustChangePassword = true`, na empresa do
ADMIN. **409** `EMAIL_ALREADY_IN_USE`.

## `PATCH /users/:id`

```json
{ "name": "Bruno Silva", "role": "PASSENGER" }
```

Ambos opcionais. `email` e `status` **não** são alteráveis por aqui.

**200** — `UserSummary`. A troca de role vale na próxima requisição do usuário afetado.
**404** `USER_NOT_FOUND`; **409** `LAST_ADMIN` ao tirar o role `ADMIN` do último ADMIN ativo.

## `POST /users/:id/deactivate`

**200** — `UserSummary` com `status = INACTIVE`; todas as sessões do usuário são revogadas
(FR-015). Idempotente. **404**; **409** `LAST_ADMIN` (inclui o ADMIN tentando se desativar sendo o
último).

## `POST /users/:id/activate`

**200** — `UserSummary` com `status = ACTIVE`. Sessões revogadas **não** voltam. Idempotente.
**404**.

## `POST /users/:id/reset-password`

```json
{ "temporaryPassword": "********" }
```

**204** — senha substituída, `mustChangePassword = true`, todas as sessões do usuário revogadas
(FR-016, FR-016a). **404**; **400** `VALIDATION_FAILED` (menos de 8 caracteres).
