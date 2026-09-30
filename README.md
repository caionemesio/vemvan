# VemVan

Plataforma de transporte corporativo. Monorepo com npm workspaces:

| Pacote | O que é | Stack |
|--------|---------|-------|
| `apps/api` | API | NestJS, Sequelize, PostgreSQL |
| `apps/admin` | Painel administrativo | Next.js, Tailwind CSS, shadcn/ui |
| `apps/mobile` | Aplicativo | Expo, React Native, expo-router |
| `packages/shared` | Código compartilhado entre os apps | TypeScript compilado para `dist/` |

## Pré-requisitos

- **Node 22** (versão fixada em `.nvmrc` — com nvm: `nvm use`)
- **Docker** em execução (PostgreSQL local)
- Para o Mobile, um destes: emulador Android (Android Studio), simulador iOS (Xcode), celular com
  o app **Expo Go**, ou apenas o navegador

## Do clone ao ambiente rodando

### 1. Instalar dependências

```bash
git clone <url-do-repositorio> vemvan
cd vemvan
npm install
```

Um único `npm install` na raiz instala todos os workspaces. Não rode `npm install` dentro de
`apps/*`.

### 2. Compilar o package compartilhado

```bash
npm run build:shared
```

Os três apps importam `@vemvan/shared` a partir de `packages/shared/dist/`. **Sem este passo nenhum
app sobe** (erro `Cannot find module '@vemvan/shared'`). Repita-o sempre que alterar
`packages/shared/src/`.

### 3. Configurar o ambiente

```bash
cp apps/api/.env.example apps/api/.env
```

Os valores de exemplo funcionam para desenvolvimento local; ajuste se precisar.

> **`apps/api/.env` é a fonte única das credenciais do banco.** A API lê esse arquivo, e o Docker
> Compose também: os scripts `db:up`/`db:down` passam `--env-file apps/api/.env`, e o
> `docker-compose.yml` monta o PostgreSQL com essas mesmas variáveis (`DB_USER`, `DB_PASSWORD`,
> `DB_NAME`, `DB_PORT`). Nunca coloque credenciais direto no `docker-compose.yml` — mude só o `.env`.
>
> O `.env` não é versionado; só o `.env.example`, que não contém credenciais reais.

Se a porta do PostgreSQL já estiver em uso na sua máquina, altere `DB_PORT` em `apps/api/.env`.

Admin e Mobile não têm arquivo de ambiente: ainda não consomem configuração.

### 4. Subir o banco e aplicar as migrations

```bash
npm run db:up        # sobe o PostgreSQL 16 em contêiner, com volume persistente
npm run db:migrate   # aplica as migrations pendentes
```

`npm run db:down` para o contêiner **preservando os dados**. `npm run db:migrate:undo` reverte a
última migration.

O schema é gerenciado **somente** por migrations versionadas em
`apps/api/src/database/migrations/` — nunca por `sequelize.sync()`.

### 5. Iniciar a API

```bash
npm run dev:api
```

Verifique a conexão com o banco:

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"connected"}
```

A porta vem de `PORT` em `apps/api/.env` (3000 no exemplo). Se o banco não estiver acessível, a API **encerra no
startup** com uma mensagem explicando o motivo — é intencional. Suba o banco (passo 4) e tente de
novo.

### 6. Iniciar o Admin

Em outro terminal:

```bash
npm run dev:admin
```

Abra <http://localhost:3001>. O Admin roda na porta 3001 para não colidir com a API.

### 7. Iniciar o Mobile

Em outro terminal:

```bash
npm run dev:mobile
```

No terminal do Expo, pressione `a` (Android), `i` (iOS) ou `w` (navegador), ou leia o QR code com
o Expo Go no celular. A tela inicial mostra "VemVan — O aplicativo está funcionando."

#### Emulador Android

Com o emulador aberto, se o Expo Go ficar parado na tela de carregamento (o emulador não alcança o
IP da sua rede), use a ponte do `adb` e o modo localhost:

```bash
adb reverse tcp:8081 tcp:8081
npm run dev:mobile -- --localhost
```

e pressione `a`. Na primeira abertura o Expo Go mostra o menu de desenvolvedor por cima do app —
feche-o para ver a tela.

#### Verificação automatizada no dispositivo

O projeto inclui o [`agent-device`](https://github.com/callstack/agent-device) para inspecionar o
app em emulador/simulador pela linha de comando. Com o Metro rodando em `--localhost`:

```bash
cd apps/mobile
npx agent-device doctor                                               # checa o ambiente
npx agent-device open "exp://127.0.0.1:8081" --platform android --session qa
npx agent-device snapshot --session qa                                # árvore de acessibilidade
npx agent-device close --session qa
```

## Scripts da raiz

| Script | Ação |
|--------|------|
| `npm run dev:api` | API em modo watch |
| `npm run dev:admin` | Admin em <http://localhost:3001> |
| `npm run dev:mobile` | Servidor de desenvolvimento do Expo (flags extras após `--`) |
| `npm run db:up` | Sobe o PostgreSQL |
| `npm run db:down` | Para o PostgreSQL, preservando os dados |
| `npm run db:migrate` | Aplica migrations pendentes |
| `npm run db:migrate:undo` | Reverte a última migration |
| `npm run build:shared` | Compila `packages/shared` para `dist/` |

## Problemas comuns

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `Cannot find module '@vemvan/shared'` | `packages/shared` não compilado | `npm run build:shared` |
| API encerra com `Failed to connect to PostgreSQL` | Banco fora do ar ou `.env` divergente | `npm run db:up` e confira `apps/api/.env` |
| API encerra apontando uma variável ausente | `.env` incompleto | Compare com `apps/api/.env.example` |
| `db:up` falha por porta em uso | Outro PostgreSQL na porta | Altere `DB_PORT` em `apps/api/.env` |
| Expo Go preso carregando no emulador Android | Emulador não alcança o IP da LAN | Veja [Emulador Android](#emulador-android) |

## Documentação do projeto

- `.specify/memory/constitution.md` — princípios e restrições do projeto (fonte de verdade)
- `specs/` — especificação, plano e tarefas de cada feature
- `CLAUDE.md` — regras operacionais para agentes de código
