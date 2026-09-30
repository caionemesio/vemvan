# CLAUDE.md

Regras operacionais do repositório VemVan para agentes de código.

**Fonte de verdade**: `.specify/memory/constitution.md`. Leia-a antes de propor qualquer mudança —
princípios, stack permitida, escopo de MVP e governança estão lá e não são repetidos aqui. Em caso
de conflito, a constitution prevalece sobre este arquivo.

Setup, scripts e passo a passo de execução estão no `README.md`.

## Fluxo de trabalho

- Toda feature segue o ciclo spec-kit: `specs/<nnn-feature>/` contém `spec.md`, `plan.md`,
  `research.md`, `tasks.md` e demais artefatos. Use as skills `speckit-*` (specify → clarify → plan →
  tasks → implement).
- Ao implementar, marque as tarefas concluídas como `[X]` em `tasks.md`. Desvios do plano e
  dependências novas são registrados em `research.md` da feature, com a justificativa.
- Não implemente nada fora da spec da feature em andamento. Mudanças oportunistas viram spec própria.

## Estrutura

```
apps/api/        NestJS — src/config, src/database (migrations + migrator Umzug), src/health
apps/admin/      Next.js App Router — src/app, src/components/ui (shadcn), src/lib
apps/mobile/     Expo — rotas em src/app (expo-router), metro.config.js de monorepo
packages/shared/ @vemvan/shared — compilado para dist/ (CommonJS)
specs/           artefatos spec-kit por feature
```

`apps/admin/AGENTS.md` e `apps/mobile/AGENTS.md` trazem as orientações específicas de Next.js e Expo
(ambas mudam a cada versão — consulte a documentação da versão instalada, não a memória).

## Dependências

- Instale sempre a partir da raiz: `npm install <pkg> --workspace apps/<app>`. Nunca rode
  `npm install` dentro de `apps/*` nem deixe `package-lock.json` aninhado.
- No Mobile, dependências com código nativo passam por `npx expo install <pkg>` (dentro de
  `apps/mobile`) para obter a versão compatível com o SDK.
- **React é único no monorepo e sua versão é ditada pelo React Native.** O Admin fica fixado na
  mesma versão de `react`/`react-dom` que o Mobile. Atualizar o React só no Admin quebra o Mobile em
  runtime — confira com `npx expo-doctor` em `apps/mobile`.
- Componentes do shadcn/ui entram pela CLI (`npx shadcn@latest add <componente>` em `apps/admin`).
  O Admin usa Tailwind CSS **v4**: configuração via CSS em `src/app/globals.css`, sem
  `tailwind.config.js`.

## `packages/shared`

- Os apps consomem `dist/`, não o fonte. Depois de alterar `packages/shared/src/`, rode
  `npm run build:shared` antes de testar qualquer app.
- Só entra no `shared` o que for de fato compartilhado entre API e clientes e tiver spec.

## Banco e API

- Schema muda **apenas** por migration nova em `apps/api/src/database/migrations/`. Nunca edite uma
  migration já aplicada; nunca use `sequelize.sync()`; nunca introduza Prisma.
- Configuração vem de variáveis de ambiente validadas em `apps/api/src/config/`. Variável nova
  entra na validação **e** no `apps/api/.env.example`, sem valor real.
- Nunca leia, exiba ou versione arquivos `.env`.

## Verificação antes de concluir

- Verificação de tipos no pacote alterado: `npx tsc --noEmit -p .` dentro dele. No Admin, os tipos
  de rota do Next (`LayoutProps`, `PageProps`) só existem depois de `next build` ou `next typegen`.
- Mudança visual no Admin: abra <http://localhost:3001> e confira a página renderizada.
- Mudança no Mobile: abra o app em um alvo real — compilar o bundle não conta. O alvo padrão de
  verificação é o **emulador Android**, com `agent-device` (seção "Emulador Android" do README):
  confirme o texto esperado com `snapshot`/`wait text`, não apenas com screenshot. Feche o menu de
  desenvolvedor do Expo Go antes de verificar.
