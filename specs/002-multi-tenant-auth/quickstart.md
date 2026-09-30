# Quickstart — Validação da Multi-Tenant Auth

**Feature**: 002-multi-tenant-auth | **Date**: 2026-09-30

Roteiro de aceite. Cada passo aponta os requisitos e critérios que prova. Contratos em
[`contracts/`](./contracts/), modelo em [`data-model.md`](./data-model.md).

## Pré-requisitos

- Ambiente da feature 001 funcionando (`README.md`): banco no ar, `npm run build:shared`.
- `apps/admin/.env.local` com `API_URL=http://localhost:3000` e `apps/mobile/.env` com
  `EXPO_PUBLIC_API_URL=http://localhost:3000` (copiados dos `.env.example`).
- Emulador Android `Pixel_8` com `adb reverse tcp:8081 tcp:8081` **e** `adb reverse tcp:3000 tcp:3000`.

---

## 1. Migrations — schema de domínio

```bash
npm run db:migrate        # executado pelo usuário (bloqueado para agentes)
```

**Esperado**: `companies`, `users`, `sessions` e `login_throttles` existem; `_foundation_check` não
existe mais. `npm run db:migrate:undo` duas vezes volta ao estado da feature 001, com
`_foundation_check` recriada; reaplicar antes de seguir.

## 2. Testes automatizados — FR-021, SC-004 a SC-007

```bash
npm run test:e2e --workspace apps/api
```

**Esperado**: todas as suítes passam contra o banco `vemvan_test` (nunca o de desenvolvimento). Cobrem
isolamento entre empresas, autorização por role e por cliente, revogações, troca obrigatória de
senha e bloqueio por tentativas (research.md D10).

## 3. Provisionamento — FR-002, FR-002a

```bash
npm run company:create -- --name "Empresa A" --admin-name "Ana" --admin-email "ana@a.test"
npm run company:create -- --name "Empresa B" --admin-name "Beto" --admin-email "beto@b.test"
npm run company:list
```

**Esperado**: duas empresas ativas; cada comando mostra a senha inicial **uma vez**. Repetir um
e-mail falha sem criar nada.

## 4. ADMIN no painel — História 1, SC-001

`npm run dev:api` e `npm run dev:admin`; abrir <http://localhost:3001>.

1. Sem sessão, `/` redireciona para `/login`.
2. Entrar como `ana@a.test` com a senha inicial → é levada à troca de senha, e nenhuma outra página
   abre antes disso.
3. Trocar a senha → vê "Empresa A" e o próprio nome.
4. Sair → voltar com o botão do navegador não mostra conteúdo interno.
5. Senha errada e e-mail inexistente → **a mesma** mensagem.

## 5. Gestão de pessoas — História 2, SC-002

Como Ana: cadastrar `bruno@a.test` (DRIVER) e `carla@a.test` (PASSENGER), com senhas iniciais.

**Esperado**: ambos aparecem na lista; cadastrar `BRUNO@a.test ` de novo é recusado (FR-004); trocar
o role de Carla funciona; tentar desativar Ana (única ADMIN) é recusado (FR-007).

## 6. Motorista e passageiro no app — História 3, SC-003

```bash
npm run dev:mobile -- --localhost
```

No emulador, com `agent-device` (seção "Emulador Android" do README):

1. Entrar como `bruno@a.test` → troca obrigatória de senha → tela inicial com "Bruno", "Empresa A"
   e o papel de motorista.
2. Fechar e reabrir o app → continua autenticado.
3. Sair → reabrir exige login.
4. Entrar como `ana@a.test` → recusado com orientação para usar o painel (FR-013).

## 7. Revogação na próxima interação — FR-015, FR-016a, SC-006

Com Bruno autenticado no app:

1. Ana desativa Bruno no painel → a próxima ação de Bruno no app o leva ao login.
2. Ana reativa Bruno e redefine a senha dele → a sessão antiga continua inválida; no login, troca
   obrigatória.
3. `npm run company:deactivate -- --id <Empresa A>` → Ana perde o acesso no próximo clique;
   reativar com `company:activate`.

## 8. Isolamento entre empresas — História 4, SC-004

Como Beto (Empresa B), no painel e direto na API com o token dele:

- `GET /users` não lista ninguém da Empresa A.
- `GET`, `PATCH`, `deactivate` e `reset-password` com o `id` de Bruno → `404 USER_NOT_FOUND`,
  idêntico a um id inexistente.
- `POST /users` com `"companyId": "<id da Empresa A>"` no corpo → o usuário é criado na Empresa B.

## 9. Bloqueio por tentativas — FR-012

Cinco senhas erradas para `carla@a.test` → a sexta tentativa, **mesmo com a senha certa**, é
recusada com a mensagem genérica; após 15 minutos, volta a funcionar. Repetir com um e-mail
inexistente: comportamento idêntico.

## 10. Higiene — FR-010, SC-007

- Nenhuma resposta da API contém `passwordHash`, `tokenHash` ou senha.
- Os logs da API e do CLI (exceto a saída única do `company:create`) não contêm senhas nem tokens.
- `sessions.token_hash` tem 64 caracteres hex; o token devolvido no login não aparece no banco.
