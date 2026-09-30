# Phase 0 — Research: Multi-Tenant Auth

**Feature**: 002-multi-tenant-auth | **Date**: 2026-09-30

Decisões técnicas que a spec deixou para o planejamento. Regra aplicada em todas: Constitution,
Princípio II — o mais simples que cumpre os requisitos de hoje. Versões instaladas estão em
`specs/001-project-foundation/research.md` (D7).

---

## D1 — Mecanismo de sessão

**Decision**: sessões **opacas no banco**. No login a API gera um token aleatório de 32 bytes
(`crypto.randomBytes`, base64url), devolve-o uma única vez e guarda apenas o **SHA-256** dele na
tabela `sessions`, com `client` (`admin`/`mobile`), `expires_at` e `revoked_at`. Toda requisição
autenticada resolve o token → sessão → usuário → empresa em uma consulta e valida, **a cada
chamada**: sessão não expirada e não revogada, usuário ativo, empresa ativa.

**Rationale**: três requisitos da spec exigem que o acesso caia *na próxima interação*, mesmo com a
sessão dentro do prazo: usuário desativado (FR-015), empresa desativada (FR-015) e senha
redefinida (FR-016a), além do logout imediato (FR-014). Com o estado no banco, revogar é um
`UPDATE`, e desativar usuário ou empresa passa a valer sozinho, porque a checagem lê a situação
atual. O role também é lido da linha atual do usuário, então uma troca de role vale na próxima
requisição (edge case da spec). SHA-256 simples basta para o token: com 256 bits de entropia não há
dicionário a atacar, e um vazamento da tabela não entrega tokens utilizáveis.

**Alternatives considered**:
- *JWT stateless*: não revoga sem uma lista de bloqueio ou uma consulta ao banco por requisição —
  e, com a consulta, perde a única vantagem. Traz dependência e gestão de chave sem ganho.
- *JWT de curta duração + refresh token*: resolve a revogação só no prazo do access token (minutos),
  e a spec pede "na próxima interação". Dois tokens, rotação e mais código.
- *Passport (`@nestjs/passport`)*: abstração para múltiplas estratégias; aqui há uma só. Um guard
  de ~40 linhas é mais legível.

---

## D2 — Hash de senha

**Decision**: `crypto.scrypt` nativo do Node, com salt aleatório de 16 bytes por senha, formato
armazenado `scrypt$N$r$p$salt$hash` e comparação com `crypto.timingSafeEqual`. Parâmetros:
`N=16384, r=8, p=1`, chave de 64 bytes.

**Rationale**: é um KDF resistente a força bruta (FR-010) sem dependência nova nem binário nativo
para compilar. O formato com parâmetros embutidos permite endurecê-los depois sem invalidar hashes
existentes.

**Alternatives considered**:
- *argon2*: o mais recomendado hoje, mas exige módulo nativo (`argon2`) e build em cada ambiente.
  Pode substituir o scrypt depois, sem migração, graças ao prefixo no formato.
- *bcrypt*: nativo também (ou `bcryptjs`, lento), e trunca senhas em 72 bytes.

---

## D3 — Sessão no Admin (Next.js 16)

**Decision**: o navegador **nunca recebe o token da API**. O login é uma Server Action que chama
`POST /auth/login` servidor-a-servidor e grava o token num cookie `vemvan_session` **httpOnly**,
`SameSite=Lax`, `Secure` em produção, `path=/`, com `maxAge` igual ao prazo da sessão (8 h). Todo
acesso à API sai do servidor do Next, que repassa o token como `Authorization: Bearer`.

- `src/proxy.ts` (convenção do Next 16 — `middleware.ts` foi renomeado) faz só a checagem
  otimista: sem cookie → redireciona para `/login`. Não consulta a API, como o guia de autenticação
  do Next recomenda para a proxy.
- Um Data Access Layer (`src/lib/session.ts`, `verifySession()` com `React.cache`) chama
  `GET /auth/me` em cada renderização protegida. **Esta** é a verificação real; a proxy é só atalho
  de navegação.
- A API continua sendo a única autoridade (FR-019): o Admin nunca decide sozinho.

**Rationale**: cookie httpOnly tira o token do alcance de JavaScript no navegador (XSS). Fazer as
chamadas pelo servidor do Next dispensa CORS e cookies cross-site entre as portas 3001 e 3000, e o
mesmo arranjo funciona em produção com domínios diferentes.

**Configuração**: o Admin passa a ter o primeiro arquivo de ambiente — `API_URL` (somente servidor,
sem prefixo `NEXT_PUBLIC_`) em `apps/admin/.env.example`. É o que a decisão D8 da feature 001
previa ("quando o Admin passar a chamar a API, ele ganha o seu").

**Alternatives considered**:
- *Navegador chamando a API direto com cookie da API*: exige CORS com credenciais e cookie
  cross-site em produção; mais superfície e mais configuração.
- *Token em `localStorage`*: exposto a qualquer XSS.

---

## D4 — Sessão no Mobile (Expo SDK 57)

**Decision**: o token vai para o **`expo-secure-store`** (Keychain no iOS, Keystore no Android) e
é enviado como `Authorization: Bearer`. As telas usam `Stack.Protected` do `expo-router` com
`guard` derivado do estado de sessão. Na abertura do app, o token salvo é validado com
`GET /auth/me`; `401` limpa o token e leva ao login (spec, história 3, cenário 5).

**Nova dependência**: `expo-secure-store` `~57.0.4` (versão do SDK, instalada com
`npx expo install`). Justificativa: FR-014 exige sessão persistente entre aberturas do app, e
guardar credencial fora do armazenamento seguro do sistema seria inaceitável. Faz parte do Expo Go,
então não exige development build.

**Configuração**: `EXPO_PUBLIC_API_URL` em `apps/mobile/.env.example` (é público por natureza: vai
no bundle). No emulador Android, `adb reverse tcp:3000 tcp:3000` + `http://localhost:3000`, o mesmo
padrão já documentado para o Metro (feature 001, D10).

**Alternatives considered**:
- *AsyncStorage*: não criptografado.
- *Proteção por redirecionamento manual em cada tela*: `Stack.Protected` já resolve e evita telas
  protegidas "piscarem" antes do redirecionamento.

---

## D5 — Bloqueio por tentativas de login (FR-012)

**Decision**: tabela `login_throttles`, chave = e-mail normalizado, com `failed_count` e
`locked_until`. Falha incrementa; na 5ª, `locked_until = agora + 15 min` e zera o contador. Sucesso
apaga a linha. Enquanto bloqueado, o login responde a **mesma** mensagem genérica de credenciais
inválidas.

**Rationale**: chavear por e-mail — e não por usuário — faz o bloqueio valer também para e-mails
inexistentes, o que é necessário para não revelar quais e-mails existem (FR-011). Persistir no
banco mantém o bloqueio entre reinícios e entre instâncias da API.

**Alternatives considered**:
- *Contador em memória*: perde-se no reinício e não funciona com mais de uma instância.
- *Colunas no `users`*: não cobre e-mails inexistentes, e a diferença de comportamento revelaria a
  existência da conta.
- *Rate limit por IP (`@nestjs/throttler`)*: complementar, não substitui o requisito por e-mail.
  Fica para quando houver exposição pública real.

---

## D6 — Validação de entrada e campos não confiáveis

**Decision**: `class-validator` + `class-transformer` com `ValidationPipe` global
`{ whitelist: true, transform: true }` — **sem** `forbidNonWhitelisted`.

**Rationale**: é o que a Constitution prescreve ("DTOs com validação adequada do NestJS
(class-validator / class-transformer)"). `whitelist` **remove** do corpo qualquer campo não
declarado no DTO — `companyId`, `role` num endpoint que não o aceita, `status` — antes de chegar ao
service. A spec diz que esses valores MUST ser **ignorados** (FR-017, história 4 cenário 3), não
rejeitados; por isso `forbidNonWhitelisted` fica desligado.

**Novas dependências**: `class-validator`, `class-transformer` em `apps/api`.

---

## D7 — Isolamento por empresa na API

**Decision**: o guard de autenticação anexa à requisição um `AuthContext`
(`{ userId, companyId, role, sessionId }`) lido do banco, e um decorator `@CurrentAuth()` o entrega
ao controller. **Toda** função de repository que lê ou altera dado de empresa recebe `companyId`
como primeiro parâmetro obrigatório e o coloca no `WHERE`. Não existe método "buscar por id" sem
empresa. Registro de outra empresa → `404`, igual a inexistente (FR-018). Autorização por role via
decorator `@Roles('ADMIN')` + guard.

**Rationale**: tornar o `companyId` parâmetro obrigatório do repository faz o compilador lembrar do
isolamento em cada chamada nova, e a regra fica visível no código em vez de escondida.

**Alternatives considered**:
- *Scopes padrão do Sequelize / hooks globais*: mágico e fácil de contornar sem perceber
  (`unscoped()`), além de difícil de testar.
- *Row Level Security no PostgreSQL*: defesa forte, mas acopla a aplicação a recursos específicos
  do banco e ao controle de sessão da conexão — contra o desacoplamento de provedor exigido pela
  Constitution. Candidato a camada extra no futuro, não substituto.

---

## D8 — Modelos Sequelize

**Decision**: `sequelize-typescript` (já instalado desde a feature 001) com modelos `Company`,
`User`, `Session` e `LoginThrottle`, registrados explicitamente em `models: [...]` no
`DatabaseModule`. `synchronize: false` e `autoLoadModels: false` permanecem; o schema continua
vindo só das migrations. Tabelas e colunas em inglês, `snake_case` (`underscored: true`). Chaves
primárias **UUID v4**.

**Rationale**: UUID não revela volume de cadastros nem permite enumerar registros por incremento.
Registro explícito dos modelos mantém visível o que existe.

**Nota**: a validação de conexão no boot continua explícita em `main.ts` (feature 001, D3); não
depender do `autoLoadModels` para isso.

---

## D9 — Provisionamento de empresas (FR-002, FR-002a)

**Decision**: CLI TypeScript em `apps/api/src/provisioning/cli.ts`, no mesmo molde do `migrator.ts`
(roda fora do Nest, valida o ambiente sozinho), com scripts na raiz:

- `npm run company:create -- --name "<empresa>" --admin-name "<nome>" --admin-email "<email>"` —
  cria a Company ativa e o primeiro ADMIN com **senha inicial aleatória** (`must_change_password`),
  exibida uma única vez no terminal.
- `npm run company:deactivate -- --id <uuid>` e `company:activate` — alteram a situação; a
  desativação revoga as sessões abertas da empresa.

**Rationale**: FR-002 pede provisionamento fora do painel e do app, sem papel de operador. Um CLI
executado por quem tem acesso ao ambiente é o menor mecanismo que cumpre isso.

---

## D10 — Testes (FR-021)

**Decision**: testes **e2e da API** com Vitest (`vitest.config.e2e.ts`, já presente) + `supertest`
(já instalado), contra um PostgreSQL real num banco **separado**, `vemvan_test`, no mesmo
contêiner. O setup global cria o banco se não existir, aplica as migrations nele e limpa as tabelas
entre suítes. Cobertura priorizada pelo risco (Princípio VII):

1. isolamento entre empresas — leitura, alteração, desativação e redefinição cruzadas, com
   identificadores manipulados;
2. autorização por role e por cliente (painel × app);
3. revogação: logout, desativação de usuário e de empresa, redefinição de senha, troca de role;
4. troca obrigatória de senha bloqueando o resto;
5. bloqueio por tentativas e mensagem idêntica para e-mail existente e inexistente.

Hash de senha e geração de token ganham testes unitários curtos. Admin e Mobile **não** ganham
testes automatizados nesta feature: a lógica de risco está na API, e as telas são validadas pelo
`quickstart.md` (Mobile no emulador Android com `agent-device`).

**Ponto de atenção operacional**: as migrations do banco de desenvolvimento são executadas pelo
usuário (`npm run db:migrate*` é bloqueado para agentes). O setup de testes migra **somente** o
banco descartável `vemvan_test`, nunca o `DB_NAME` de desenvolvimento — isso precisa ser garantido
no código do setup (recusar rodar se o nome do banco não terminar em `_test`).

---

## D11 — `packages/shared`

**Decision**: o `shared` recebe os primeiros contratos reais: o tipo `Role`
(`'ADMIN' | 'DRIVER' | 'PASSENGER'`) com a lista `ROLES`, e os tipos das respostas públicas da API
usadas por Admin e Mobile (`AuthUser`, `LoginResponse`, `UserSummary`). **Só tipos e constantes** —
nada de validação nem lógica.

**Rationale**: é exatamente o critério da feature 001 para o `shared` crescer ("quando a primeira
feature precisar compartilhar um contrato real entre API e clientes"). Os DTOs com
`class-validator` ficam na API, porque decorators de validação não servem aos clientes.

---

## D12 — MVVM nos frontends

**Decision**: telas com lógica de apresentação — login, troca de senha, lista e formulário de
pessoas — seguem MVVM (Constitution, Princípio V), organizadas por feature:

- Admin: `src/features/auth/login/{LoginView.tsx, useLoginViewModel.ts, Login.tsx}`,
  `src/features/auth/change-password/...`, `src/features/users/{list,form}/...`. As páginas em
  `src/app/` só montam o Binder.
- Mobile: `src/features/auth/login/...`, `src/features/auth/change-password/...`,
  `src/features/home/...`; rotas em `src/app/` referenciam os Binders (feature 001, D9).

A ViewModel é um hook (`useXViewModel`) que concentra estado, loading, erros e chamadas; não
contém JSX. A View recebe props e emite eventos. Componentes puramente visuais não usam MVVM.
