# Phase 1 — Data Model: Project Foundation

**Feature**: 001-project-foundation | **Date**: 2026-08-27

## Entidades de domínio: nenhuma

Esta feature **não modela domínio**. Não existem Company, User, Vehicle, Route, Trip nem
TripPassenger (FR-023). Qualquer entidade de domínio que apareça na implementação é violação de
escopo, não progresso.

O que segue são as duas únicas estruturas que a fundação cria no banco, ambas técnicas.

---

## T1 — `SequelizeMeta` (histórico de migrations)

Criada e mantida automaticamente pelo `SequelizeStorage` do Umzug (D4). Não é escrita à mão e não é
consultada pela aplicação.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `name` | `VARCHAR(255)` PK | Nome do arquivo da migration aplicada |

**Comportamento verificável** (SC-004, FR-008):
- Ao aplicar a migration técnica, uma linha é inserida.
- Ao reverter, a linha é removida.
- Reexecutar o comando de migrate com tudo aplicado não insere nada e não falha — é a idempotência
  exigida pelo edge case da spec.

---

## T2 — `_foundation_check` (tabela descartável)

Criada pela única migration técnica desta feature (FR-009, decisão de clarify nº 4). Existe apenas
para tornar observável que aplicar e reverter migrations funciona de verdade.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | `INTEGER` PK, autoincrement | Sem significado |
| `created_at` | `TIMESTAMPTZ NOT NULL` | Sem significado |

**Regras**:
- A tabela MUST NOT ter qualquer significado de domínio, e nada na aplicação pode lê-la ou escrevê-la.
- Não existe model Sequelize correspondente. Ela é criada por SQL/QueryInterface na migration e mais
  nada no código a referencia.
- O prefixo `_` e o nome sinalizam que é descartável.
- A migration e a tabela são **removidas na primeira feature que trouxer uma migration de domínio**.
  Isso é dívida deliberada e datada, não permanente.

**Ciclo de vida verificável**:

```
migrate      → _foundation_check existe   + 1 linha em SequelizeMeta
migrate:undo → _foundation_check não existe + 0 linhas em SequelizeMeta
```

---

## Conteúdo de `packages/shared`

O package precisa ser importável para satisfazer FR-016, mas não pode conter domínio antecipado
(FR-017). O conteúdo mínimo é um único export sem valor de domínio, suficiente para provar que a
resolução de módulos e de tipos funciona ponta a ponta.

Exemplo de conteúdo aceitável: uma constante com o nome do package ou a sua versão. Exemplo de
conteúdo **inaceitável**: `UserRole`, `TripStatus`, DTOs, contratos de API, enums de domínio — nada
disso tem spec ainda.

O `shared` cresce quando a primeira feature precisar compartilhar um contrato real entre API e
clientes.
