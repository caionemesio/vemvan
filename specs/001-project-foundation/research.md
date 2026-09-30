# Phase 0 — Research: Project Foundation

**Feature**: 001-project-foundation | **Date**: 2026-08-27

Este documento resolve as decisões técnicas que a spec deferiu explicitamente ao planejamento
(package manager, workspaces, nomes de scripts, ferramenta de migrations) e as incógnitas
levantadas ao preencher o Technical Context.

Regra aplicada em todas as decisões: Constitution, Princípio II — o mais simples que resolve o
problema real de hoje.

---

## D1 — Package manager e estratégia de workspaces

**Decision**: npm workspaces (npm 10+, incluso no Node 22 LTS). Sem Turborepo, Nx ou Lerna.

**Rationale**: O monorepo tem 4 pacotes e nenhuma necessidade de cache distribuído, task graph ou
orquestração de builds. npm workspaces já resolve linkagem e instalação única. É também a opção com
menor risco no React Native: o Metro bundler resolve dependências por caminho real e historicamente
sofre com a estrutura de `node_modules` do pnpm, exigindo `node-linker=hoisted` para funcionar.
Escolher npm evita esse problema inteiro.

**Alternatives considered**:
- *pnpm workspaces*: instalação mais rápida e disco menor, mas exige configuração extra para o
  Metro. Custo de configuração sem benefício correspondente nesta escala.
- *Turborepo / Nx*: ferramental de orquestração que só compensa com muitos pacotes e CI pesado.
  Violaria FR-002 e o Princípio II hoje. Pode ser adicionado depois sem retrabalho.
- *Yarn Berry (PnP)*: incompatível com o Metro sem configuração significativa.

---

## D2 — Consumo do package compartilhado

**Decision**: `packages/shared` é compilado por `tsc` para `dist/`, e expõe `main: dist/index.js` +
`types: dist/index.d.ts`. As aplicações consomem JavaScript já compilado com os tipos ao lado.

**Rationale**: É a única forma que funciona igual nos três consumidores (Nest, Next e Metro) sem
configuração especial em cada um. Publicar o TypeScript-fonte direto exigiria `transpilePackages` no
Next, ajuste de `watchFolders`/`resolver` no Metro **e** contorno do `rootDir` no build do Nest —
três configurações frágeis e diferentes para resolver o mesmo problema. O custo é um passo de build
do `shared` antes das aplicações, encadeado nos scripts da raiz.

**Alternatives considered**:
- *Exportar TS-fonte (`main: src/index.ts`)*: dispensa build, mas espalha configuração específica
  por app e é a origem clássica de erros de resolução no Metro.
- *tsconfig `paths` apontando para o fonte*: resolve para o `tsc`, não para o runtime nem para o
  bundler. Meia solução.

**Nota de risco**: enquanto o `shared` não tiver conteúdo real, a validação de FR-016 depende de um
export trivial. Ver `data-model.md`.

---

## D3 — Integração NestJS ↔ Sequelize

**Decision**: `@nestjs/sequelize` + `sequelize` + `pg`, configurado de forma assíncrona a partir do
`@nestjs/config`, com `synchronize: false`, `autoLoadModels: false` e `retryAttempts: 0`.

**Rationale**: É o módulo oficial e dá acesso à instância do Sequelize por injeção de dependência,
que é o que o endpoint de saúde precisa. Três parâmetros carregam decisões da spec e devem ficar
explícitos no código:
- `synchronize: false` → FR-007, torna visível que o schema nunca é sincronizado automaticamente.
- `autoLoadModels: false` → FR-023, não há modelos nesta feature.
- `retryAttempts: 0` → mantido por consistência, mas **não é o que garante a falha rápida** (ver
  correção abaixo).

**Correção aplicada na implementação (2026-08-27)**: o factory de conexão do `@nestjs/sequelize`
retorna **antes** de autenticar quando `autoLoadModels` é falso:

```js
if (!options.autoLoadModels) { return sequelize; }   // nunca chega no authenticate()
await sequelize.authenticate();
```

Ou seja, as duas opções escolhidas acima se cancelavam: com `autoLoadModels: false` não existe
verificação de conexão no boot, e `retryAttempts` se torna irrelevante. Na prática a API subia
normalmente com o banco fora do ar — o oposto de FR-005.

A validação de conexão passou a ser **explícita em `apps/api/src/main.ts`**: o bootstrap resolve a
instância do Sequelize, chama `authenticate()` antes de `listen()` e encerra com código 1 e
mensagem diagnosticável se falhar. Isso torna o requisito visível no código, em vez de depender de
um efeito colateral da biblioteca — e não quebra se o comportamento interno dela mudar.

**Alternatives considered**:
- *Sequelize puro em um provider customizado*: mais código para replicar o que o módulo oficial já
  faz, sem ganho.
- *`sequelize-typescript` com decorators*: só faz sentido quando existirem modelos. Prematuro
  (Princípio II).

---

## D4 — Ferramenta de migrations

**Decision**: Umzug v3 com storage `SequelizeStorage`, acionado por um runner TypeScript próprio em
`apps/api/src/database/migrator.ts`, exposto por scripts npm. Migrations escritas em TypeScript em
`apps/api/src/database/migrations/`.

**Rationale**: A Constitution exige TypeScript em todas as aplicações (Princípio III). O
`sequelize-cli` espera migrations em CommonJS e configuração em `.sequelizerc`; rodá-lo com
TypeScript exige registrar `ts-node` por fora e é notoriamente frágil. O Umzug é mantido pela mesma
organização do Sequelize, é a engine que o próprio `sequelize-cli` embrulha, tem tipos de primeira
classe e o runner cabe em ~40 linhas. Menos mágica, e a estratégia de migrations fica legível no
próprio repositório.

**Correção aplicada na implementação (2026-08-27)**: como o scaffold do Nest 12 é ESM
(`"type": "module"`) e os imports usam extensão `.js`, o type-stripping nativo do Node não resolve
os especificadores ao rodar o `.ts` direto. Os scripts `db:migrate` e `db:migrate:undo` passaram a
compilar antes e executar `dist/database/migrator.js`. Isso evita adicionar `tsx`/`ts-node` só para
desenvolvimento e é o mesmo comando que funciona em produção, onde não há toolchain de TypeScript.
O `migrator.ts` já detecta se está rodando como `.ts` ou `.js` e ajusta o glob das migrations.

**Alternatives considered**:
- *`sequelize-cli`*: mais convencional e documentado, `db:migrate`/`db:migrate:undo` prontos. Perde
  em: migrations fora do TypeScript ou dependentes de gambiarra com `ts-node`, e configuração
  duplicada em `.sequelizerc`. **Este é o trade-off mais discutível deste plano** — se a preferência
  for a ferramenta padrão do ecossistema, a troca afeta apenas D4 e as tarefas de migration.
- *`sequelize.sync()`*: proibido pela Constitution e por FR-007.

---

## D5 — Validação de conexão e endpoint de saúde

**Decision**: A conexão é validada no boot pelo próprio `@nestjs/sequelize` (com `retryAttempts: 0`,
uma falha de `authenticate()` derruba o bootstrap). Adicionalmente, um `HealthController` mínimo
expõe `GET /health`, que executa `sequelize.authenticate()` e responde o estado. Sem
`@nestjs/terminus`.

**Rationale**: O boot cobre a decisão de falha rápida (clarify nº 2); o endpoint cobre a exigência
de que o estado da conexão seja "verificável externamente" (FR-005) e é o que o `quickstart.md`
usa como evidência. O Terminus traz health indicators, readiness/liveness e formato padronizado —
tudo desnecessário para um endpoint que não tem consumidor ainda (Princípio II).

**Alternatives considered**:
- *`@nestjs/terminus`*: dependência a mais para valor zero nesta feature. Vale reconsiderar quando
  existir orquestrador ou monitoramento.
- *Só o check de boot, sem endpoint*: deixaria SC-003 sem forma de verificação em uma API já no ar.

---

## D6 — PostgreSQL local e origem única das credenciais

**Decision**: `docker-compose.yml` na raiz com um serviço `postgres` e volume nomeado para
persistência. As credenciais vivem em `apps/api/.env` (decisão de clarify nº 1) e o Compose as lê
via `--env-file apps/api/.env` nos scripts da raiz.

**Rationale**: FR-019 exige que as credenciais do Compose e da API não divirjam. `env_file:` dentro
do serviço **não** serve: ele injeta variáveis dentro do contêiner, mas não alimenta a interpolação
`${...}` do próprio `docker-compose.yml`. A interpolação lê o ambiente do shell ou o arquivo passado
em `--env-file`. Passar `--env-file apps/api/.env` no script faz `apps/api/.env` ser a única fonte
de verdade das credenciais, exatamente como FR-019 pede.

**Alternatives considered**:
- *Credenciais fixas no `docker-compose.yml`*: cria uma segunda fonte de verdade, divergindo de
  `apps/api/.env` no primeiro que alguém mudar. É o que FR-019 existe para impedir.
- *`.env` na raiz só para o Compose*: contraria a decisão de clarify nº 1.

---

## D7 — Versões e scaffolding

**Decision**: Node 22 LTS (fixado em `.nvmrc` e em `engines`). As três aplicações são geradas pelas
CLIs oficiais (`@nestjs/cli`, `create-next-app`, `create-expo-app`) e as versões que elas
produzirem são fixadas no lockfile e registradas neste documento durante a implementação.

**Rationale**: Fixar versões exatas em um plano escrito antes da implementação é chute com prazo de
validade. As CLIs oficiais entregam a configuração corrente e coerente de cada framework, que é
justamente o valor de uma feature de fundação. O lockfile é o que garante reprodutibilidade.

**Ponto de atenção para a implementação**: o `create-next-app` recente entrega Tailwind CSS v4, cuja
configuração é via CSS (`@import "tailwindcss"`) e não `tailwind.config.js`. O `shadcn` CLI suporta
v4, mas o comando de init e a estrutura de tokens diferem da v3. Seguir a documentação da versão
que a CLI efetivamente instalar, e registrar a versão resultante aqui. Este é o principal risco de
atrito da História 2.

**Versões efetivamente instaladas (registrado em T012, 2026-08-27)**:

| Pacote | Versão |
|--------|--------|
| Node | 22.23.2 |
| npm | 10.9.8 |
| @nestjs/core | ^12.0.1 |
| @nestjs/sequelize | ^12.0.0 |
| @nestjs/config | ^12.0.0 |
| sequelize | ^6.37.8 |
| sequelize-typescript | ^2.1.6 |
| pg | ^8.23.0 |
| umzug | ^3.8.3 |
| typescript | ^6.0.2 |
| PostgreSQL (imagem) | postgres:16-alpine |

Nota: o scaffold do Nest 12 entrega `"type": "module"` (ESM), Vitest e oxlint por padrão.

**Admin (registrado em T027, 2026-09-30)**:

| Pacote | Versão |
|--------|--------|
| next | 16.3.7 |
| react / react-dom | 19.2.8 |
| tailwindcss | 4.3.3 (**v4** — configuração via CSS, `@import "tailwindcss"`, sem `tailwind.config.js`) |
| @tailwindcss/postcss | 4.3.3 |
| eslint | 9.39.5 (flat config, `eslint-config-next`) |
| typescript (admin) | 5.9.3 |

Nota: o Admin declara `typescript@^5` e `@types/node@^20`, enquanto a API usa `typescript@^6`. O npm
workspaces resolve o conflito instalando as versões do Admin em `apps/admin/node_modules/`, com o
restante hoisted na raiz — comportamento esperado, não resíduo do scaffold.

**Alternatives considered**:
- *Fixar versões exatas agora*: risco alto de o plano nascer desatualizado ou incoerente entre
  pacotes.
- *Configurar cada app manualmente*: mais controle, muito mais superfície de erro, sem benefício.

---

## D8 — Configuração de ambiente por aplicação

**Decision**: Só `apps/api` recebe arquivo de ambiente nesta feature (`.env` + `.env.example`
versionado), carregado com `@nestjs/config` e validação de schema no startup. `apps/admin` e
`apps/mobile` não recebem arquivos de ambiente, porque não consomem a API nem qualquer configuração
nesta feature.

**Rationale**: FR-018 exige arquivo próprio para "cada aplicação que exigir configuração". Criar
`.env.example` vazio no Admin e no Mobile seria preencher estrutura por formalidade, contra o
Princípio II e o espírito de FR-017. Quando o Admin passar a chamar a API, ele ganha o seu.

**Detalhe de implementação**: a validação de schema deve falhar no startup quando faltar variável
obrigatória — é o que cobre o edge case "variáveis ausentes ou inválidas" da spec.

**Alternatives considered**:
- *Um `.env.example` por app desde já*: antecipação sem uso.
- *Sem validação de schema*: deixaria a API subir com configuração incompleta, contrariando o edge
  case previsto na spec.

---

## D9 — Template do Expo e adoção do expo-router

**Decision**: Gerar o Mobile com o template padrão do `create-expo-app` (TypeScript), que inclui
`expo-router` e roteamento por arquivos. A tela inicial vive em `apps/mobile/app/index.tsx`, sob o
layout raiz `apps/mobile/app/_layout.tsx`.

**Rationale**: Roteamento é infraestrutura de fundação, não funcionalidade de produto — a mesma
categoria de Sequelize, Tailwind e shadcn/ui, todos adotados nesta feature sem nenhum uso de
domínio ainda. O MVP descrito na Constitution (telas separadas de Passenger e de Driver,
notificação que abre a viagem correspondente) exige navegação e deep linking, e o `expo-router`
resolve os dois com a estrutura que o próprio Expo recomenda como padrão. Sair do template padrão
custaria uma migração depois em troca de nenhum ganho hoje.

**Consequência estrutural**: a organização por feature exigida pela Constitution passa a conviver
com o diretório de rotas — `app/` contém as rotas e os layouts, enquanto as telas com estado e suas
ViewModels ficam sob `features/`, referenciadas a partir das rotas. Isso é definido na primeira
feature que tiver tela com comportamento; nesta, `app/index.tsx` é estática e não tem ViewModel nem
Binder (FR-026).

**Alternatives considered**:
- *Template em branco sem roteador*: era a decisão anterior deste documento, revertida. O argumento
  ("nenhuma feature exige navegação hoje") aplicava o Princípio II de forma inconsistente com o
  resto do plano, que adota ORM, framework de estilo e biblioteca de componentes sem uso de domínio.
- *Adotar uma biblioteca de navegação diferente (React Navigation puro)*: é o que o `expo-router`
  usa por baixo; escolhê-lo direto significaria configurar à mão o que o padrão já entrega.
