# Contract — CLI de provisionamento de empresas

**Feature**: 002-multi-tenant-auth

Interface usada **somente pela equipe VemVan**, no terminal, com acesso ao ambiente da API
(FR-002, FR-002a, research.md D9). Não existe equivalente no painel nem no app. Lê a mesma
configuração da API (`apps/api/.env` ou variáveis de ambiente) e a valida antes de agir.

Saída de sucesso em stdout, erros em stderr, exit code `0` em sucesso e `1` em qualquer falha.

## `npm run company:create -- --name <nome> --admin-name <nome> --admin-email <email>`

Cria, numa única transação, a Company `ACTIVE` e o primeiro usuário `ADMIN` com senha inicial
**aleatória** (16 caracteres) e `mustChangePassword = true`.

```
Company created: Empresa X (id 3f1c…)
First ADMIN:     Ana <ana@empresa.com>
Initial password (shown once): ****************
The ADMIN must change it on first login.
```

A senha inicial aparece **só** nessa saída; não é gravada em log nem em arquivo.

**Falhas**: argumento ausente ou inválido; e-mail já em uso (`EMAIL_ALREADY_IN_USE`). Nada é criado
em caso de falha.

## `npm run company:deactivate -- --id <uuid>`

`status = INACTIVE` e revogação de todas as sessões dos usuários da empresa. Idempotente.

## `npm run company:activate -- --id <uuid>`

`status = ACTIVE`. Sessões revogadas não voltam. Idempotente.

## `npm run company:list`

Lista `id`, nome, situação e quantidade de usuários de cada empresa — para a equipe achar o `id`
sem consultar o banco.
