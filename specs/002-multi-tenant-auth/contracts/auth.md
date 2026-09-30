# Contract — Autenticação

**Feature**: 002-multi-tenant-auth

Base: a API NestJS (`apps/api`). Corpo e respostas em JSON. Rotas autenticadas exigem
`Authorization: Bearer <token>`. Tipos compartilhados em `@vemvan/shared` (data-model.md).

## Convenções

- **Erro**: `{ "statusCode": number, "code": string, "message": string }`. `message` é texto para
  pessoa, em português; `code` é estável, para o cliente decidir o que fazer.
- Campos não declarados no corpo são **descartados** antes de qualquer processamento — inclusive
  `companyId`, `role`, `status` e `userId` (FR-017, research.md D6).
- Nenhuma resposta contém `password_hash`, `token_hash`, senha ou stack trace (FR-010).

| `code` | HTTP | Quando |
|--------|------|--------|
| `INVALID_CREDENTIALS` | 401 | e-mail inexistente, senha errada, usuário ou empresa inativos, **ou** e-mail bloqueado por tentativas — sempre a mesma mensagem (FR-011, FR-012) |
| `UNAUTHENTICATED` | 401 | token ausente, inválido, expirado ou revogado; usuário ou empresa desativados |
| `WRONG_CLIENT` | 403 | credenciais corretas, mas o role não usa esse cliente (FR-013) |
| `PASSWORD_CHANGE_REQUIRED` | 403 | sessão válida com `mustChangePassword`, em rota que não seja as liberadas abaixo |
| `FORBIDDEN` | 403 | role sem permissão para a rota |
| `VALIDATION_FAILED` | 400 | corpo inválido; `message` descreve o campo |

---

## `POST /auth/login`

Público.

```json
{ "email": "ana@empresa.com", "password": "********", "client": "ADMIN_PANEL" }
```

- `email`: string, normalizado (`trim` + minúsculas) antes de qualquer uso (FR-004).
- `password`: string, 1–200 caracteres.
- `client`: `ADMIN_PANEL` | `MOBILE_APP`.

**200** — `LoginResponse`:

```json
{
  "token": "<opaco, 43 caracteres base64url>",
  "expiresAt": "2026-09-30T20:00:00.000Z",
  "user": {
    "id": "uuid", "name": "Ana", "email": "ana@empresa.com", "role": "ADMIN",
    "mustChangePassword": false,
    "company": { "id": "uuid", "name": "Empresa X" }
  }
}
```

O token é devolvido **uma única vez**; a API guarda só o hash (research.md D1).
Prazo: 8 h para `ADMIN_PANEL`, 30 dias para `MOBILE_APP` (FR-014).

**Erros**: `401 INVALID_CREDENTIALS`; `403 WRONG_CLIENT` — `ADMIN` em `MOBILE_APP` recebe a
mensagem "Administradores acessam pelo painel web."; `DRIVER`/`PASSENGER` em `ADMIN_PANEL`
recebem "Acesse pelo aplicativo VemVan." Nenhuma sessão é criada. Com `WRONG_CLIENT` a tentativa
**não** conta como falha para o bloqueio (a senha estava certa).

**Bloqueio** (FR-012): cada falha de credencial incrementa o contador do e-mail; na 5ª, o e-mail
fica bloqueado 15 min e toda tentativa responde `INVALID_CREDENTIALS`, **mesmo com a senha certa**.

---

## `POST /auth/logout`

Autenticado (liberado mesmo com `mustChangePassword`). Revoga a sessão corrente.

**204** — sem corpo. Chamadas seguintes com o mesmo token → `401 UNAUTHENTICATED`.

---

## `GET /auth/me`

Autenticado (liberado mesmo com `mustChangePassword`). Valida a sessão e devolve o estado **atual**
do usuário — role e empresa lidos agora, não no login.

**200** — `AuthUser`. **401** `UNAUTHENTICATED` quando a sessão não vale mais (FR-015).

É a chamada que Admin (`verifySession()`) e Mobile (abertura do app) usam para saber se a sessão
continua válida.

---

## `POST /auth/change-password`

Autenticado (liberado mesmo com `mustChangePassword`).

```json
{ "currentPassword": "********", "newPassword": "********" }
```

- `newPassword`: 8–200 caracteres, diferente de `currentPassword` (FR-008a, FR-008b).

**204** — `mustChangePassword` passa a `false`; as **outras** sessões do usuário são revogadas; a
corrente continua válida.

**Erros**: `400 VALIDATION_FAILED` (senha curta ou igual à atual); `401 INVALID_CREDENTIALS` se
`currentPassword` estiver errada.

---

## Regra de sessão com senha provisória

Enquanto `mustChangePassword` for `true`, **somente** `POST /auth/logout`, `GET /auth/me` e
`POST /auth/change-password` respondem; qualquer outra rota autenticada devolve
`403 PASSWORD_CHANGE_REQUIRED` (FR-008a).
