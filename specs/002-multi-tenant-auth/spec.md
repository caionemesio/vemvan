# Feature Specification: Multi-Tenant Auth

**Feature Branch**: `002-multi-tenant-auth`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Base multi-tenant do VemVan: empresas (Company), usuários (User) com os roles ADMIN, DRIVER e PASSENGER, e autenticação. A API autentica usuários e deriva companyId e role do usuário autenticado, garantindo que dados de uma Company nunca sejam acessíveis por outra. O ADMIN faz login no painel Admin (Next.js); DRIVER e PASSENGER fazem login no app Mobile (Expo). Inclui o cadastro de usuários da própria empresa pelo ADMIN."

## Contexto

Esta é a primeira feature com regra de negócio do VemVan. Ela estabelece quem são as empresas
clientes, quem são as pessoas de cada empresa e como cada pessoa prova quem é. Todas as features
seguintes (rotas, viagens, presença) dependem de duas garantias que nascem aqui: **toda informação
pertence a uma empresa**, e **ninguém enxerga ou altera nada de outra empresa**.

A feature não cria rotas, viagens, veículos nem qualquer tela operacional além do necessário para
entrar, sair e — no caso do ADMIN — gerenciar as pessoas da própria empresa.

## Clarifications

### Session 2026-09-30

- Q: Como uma empresa nova entra no sistema? → A: Provisionamento pela equipe VemVan por um
  procedimento fora do painel e do app, que cria a Company e o primeiro ADMIN (FR-002, FR-002a).
- Q: Como o usuário cadastrado recebe o primeiro acesso? → A: O ADMIN define uma senha inicial e a
  repassa; a troca é obrigatória no primeiro login (FR-008, FR-008a).
- Q: A recuperação de senha pelo próprio usuário entra nesta feature? → A: Não. O ADMIN redefine a
  senha para uma provisória, com troca obrigatória no login seguinte; nenhum e-mail é enviado
  (FR-016, FR-016a).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - ADMIN entra no painel e vê somente a própria empresa (Priority: P1)

Um administrador de uma empresa cliente acessa o painel administrativo, informa suas credenciais e
entra. O painel mostra o nome da empresa dele e sua identificação. Ao sair, o acesso deixa de valer
naquele navegador.

**Why this priority**: Sem um administrador autenticado não existe ninguém capaz de operar o
sistema. É também a primeira superfície em que o isolamento entre empresas precisa valer.

**Independent Test**: Com uma empresa e um ADMIN já existentes, entrar no painel, conferir que o
nome da empresa exibido é o dela, sair e confirmar que as páginas internas voltam a exigir login.

**Acceptance Scenarios**:

1. **Given** um ADMIN ativo de uma empresa ativa, **When** ele informa credenciais corretas no
   painel, **Then** entra e vê o nome da própria empresa.
2. **Given** credenciais incorretas, **When** alguém tenta entrar, **Then** o acesso é negado com
   uma mensagem que não revela se o identificador existe.
3. **Given** um ADMIN autenticado, **When** ele sai, **Then** qualquer página interna volta a exigir
   login, inclusive ao usar o botão "voltar" do navegador.
4. **Given** um usuário com role DRIVER ou PASSENGER, **When** ele tenta entrar no painel, **Then** o
   acesso é negado.
5. **Given** um ADMIN recém-provisionado, com senha inicial, **When** ele entra pela primeira vez,
   **Then** é obrigado a cadastrar uma senha nova antes de ver qualquer outra página.

---

### User Story 2 - ADMIN gerencia as pessoas da própria empresa (Priority: P2)

O ADMIN cadastra motoristas, passageiros e outros administradores da empresa dele, vê a lista de
pessoas, altera nome e role, e desativa quem não deve mais ter acesso. Ele nunca vê, cria ou altera
pessoas de outra empresa.

**Why this priority**: É o que torna o sistema utilizável por mais de uma pessoa. Depende da
história 1, porque só um ADMIN autenticado pode fazê-lo.

**Independent Test**: Autenticado como ADMIN, cadastrar um DRIVER e um PASSENGER, conferir que
aparecem na lista, alterar o role de um deles, desativar outro e confirmar que o desativado não
consegue mais entrar.

**Acceptance Scenarios**:

1. **Given** um ADMIN autenticado, **When** ele cadastra uma pessoa com nome, e-mail, role
   (ADMIN, DRIVER ou PASSENGER) e senha inicial, **Then** a pessoa passa a existir vinculada à
   empresa do ADMIN — independentemente de qualquer empresa indicada na requisição.
2. **Given** um e-mail já usado por qualquer usuário do sistema, **When** o ADMIN tenta cadastrá-lo
   de novo, **Then** o cadastro é recusado com mensagem clara.
3. **Given** a lista de pessoas, **When** o ADMIN a consulta, **Then** vê somente pessoas da própria
   empresa, com nome, e-mail, role e situação (ativa ou desativada).
4. **Given** uma pessoa ativa, **When** o ADMIN a desativa, **Then** ela não consegue mais entrar e
   perde imediatamente o acesso que já tinha, mas continua registrada.
5. **Given** uma pessoa desativada, **When** o ADMIN a reativa, **Then** ela volta a conseguir
   entrar.
6. **Given** que só existe um ADMIN ativo na empresa, **When** esse ADMIN tenta se desativar ou
   trocar o próprio role, **Then** a ação é recusada, para que a empresa nunca fique sem
   administrador.
7. **Given** uma pessoa que esqueceu a senha, **When** o ADMIN a redefine para uma senha provisória,
   **Then** as sessões abertas dela deixam de valer e, no login seguinte, ela é obrigada a cadastrar
   uma senha nova.

---

### User Story 3 - Motorista e passageiro entram no aplicativo (Priority: P3)

Motoristas e passageiros abrem o aplicativo, informam suas credenciais e entram. A tela inicial os
identifica pelo nome, mostra a empresa e deixa claro se estão como motorista ou passageiro. A sessão
continua válida ao fechar e reabrir o aplicativo, até que a pessoa saia ou seja desativada.

**Why this priority**: Motoristas e passageiros são os usuários finais do transporte, mas não há
nada que façam no aplicativo antes das features de rota e viagem. Esta história entrega a porta de
entrada, pronta para essas features.

**Independent Test**: Com um DRIVER e um PASSENGER cadastrados pela história 2, entrar no aplicativo
com cada um, conferir nome, empresa e papel exibidos, fechar e reabrir o app, e sair.

**Acceptance Scenarios**:

1. **Given** um DRIVER ou PASSENGER ativo, **When** ele entra no aplicativo com credenciais
   corretas, **Then** vê seu nome, sua empresa e seu papel.
2. **Given** uma pessoa autenticada no aplicativo, **When** ela fecha e reabre o app, **Then**
   continua autenticada sem digitar as credenciais de novo.
3. **Given** uma pessoa autenticada no aplicativo, **When** ela sai, **Then** reabrir o app exige
   login.
4. **Given** um usuário com role ADMIN, **When** ele tenta entrar no aplicativo, **Then** o acesso é
   negado com orientação para usar o painel.
5. **Given** uma pessoa autenticada no aplicativo, **When** o ADMIN a desativa, **Then** na próxima
   interação ela perde o acesso e volta para a tela de login.
6. **Given** um DRIVER ou PASSENGER com senha inicial, **When** ele entra pela primeira vez no
   aplicativo, **Then** é obrigado a cadastrar uma senha nova antes de ver a tela inicial.

---

### User Story 4 - Isolamento comprovado entre empresas (Priority: P1)

Duas empresas usam o sistema ao mesmo tempo. Nenhuma pessoa de uma consegue ver, criar, alterar ou
desativar qualquer dado da outra — nem pelo painel, nem pelo aplicativo, nem manipulando
identificadores nas requisições.

**Why this priority**: Vazamento entre empresas é o risco mais grave do produto e não é recuperável
depois que acontece (Constitution, Princípio IV). É P1 junto com a história 1 porque precisa ser
verdade desde a primeira linha de código com dados de empresa.

**Independent Test**: Com duas empresas, cada uma com seu ADMIN e suas pessoas, tentar a partir de
cada empresa ler, alterar e desativar pessoas da outra, inclusive trocando identificadores de
empresa e de usuário nas requisições, e confirmar que todas as tentativas falham sem revelar dados.

**Acceptance Scenarios**:

1. **Given** um ADMIN da empresa A, **When** ele consulta a lista de pessoas, **Then** nenhuma pessoa
   da empresa B aparece.
2. **Given** um ADMIN da empresa A que conhece o identificador de uma pessoa da empresa B, **When**
   ele tenta consultá-la, alterá-la ou desativá-la, **Then** a operação falha como se a pessoa não
   existisse.
3. **Given** um ADMIN da empresa A, **When** ele envia uma requisição indicando a empresa B como
   destino de um cadastro, **Then** o valor indicado é ignorado e o cadastro, se válido, vai para a
   empresa A.
4. **Given** qualquer usuário autenticado, **When** ele envia na requisição um role ou empresa
   diferentes dos seus, **Then** o sistema usa sempre o role e a empresa do usuário autenticado.

---

### Edge Cases

- **Empresa desativada**: se a empresa inteira for desativada, nenhuma pessoa dela consegue entrar,
  e sessões já abertas perdem o acesso na próxima interação.
- **Role alterado com sessão aberta**: se o ADMIN muda o role de uma pessoa autenticada, as
  permissões novas passam a valer na próxima interação dela — nunca as antigas.
- **Muitas tentativas de login erradas**: após tentativas incorretas seguidas para o mesmo
  identificador, novas tentativas são temporariamente bloqueadas.
- **E-mail com maiúsculas ou espaços**: `Ana@Empresa.com ` e `ana@empresa.com` são o mesmo
  identificador, tanto no cadastro quanto no login.
- **Sessão expirada**: ao expirar, a pessoa é levada à tela de login com um aviso de que a sessão
  terminou.
- **Pessoa sem empresa**: não pode existir; todo usuário pertence a exatamente uma empresa.
- **Último ADMIN**: a empresa nunca pode ficar sem ao menos um ADMIN ativo (história 2, cenário 6).

## Requirements *(mandatory)*

### Functional Requirements

**Empresas**

- **FR-001**: O sistema MUST representar cada empresa cliente como uma Company, com nome e situação
  (ativa ou desativada).
- **FR-002**: Uma nova Company e o seu primeiro ADMIN MUST ser criados pela equipe do VemVan por
  meio de um procedimento de provisionamento executado fora do painel e do aplicativo, informando
  nome da empresa e nome e e-mail do primeiro ADMIN. Não existe autocadastro público nem papel de
  operador da plataforma.
- **FR-002a**: O mesmo procedimento de provisionamento MUST permitir desativar e reativar uma
  Company.

**Usuários**

- **FR-003**: Todo User MUST pertencer a exatamente uma Company e ter exatamente um role entre
  ADMIN, DRIVER e PASSENGER. USER MUST NOT existir como role.
- **FR-004**: O e-mail MUST identificar o usuário de forma única em todo o sistema, comparado sem
  diferenciar maiúsculas e minúsculas e desconsiderando espaços nas extremidades.
- **FR-005**: O ADMIN MUST poder cadastrar, listar, alterar (nome e role) e desativar/reativar
  usuários **somente da própria Company**.
- **FR-006**: Usuários desativados MUST ser preservados, nunca apagados, para não destruir histórico
  de features futuras.
- **FR-007**: O sistema MUST impedir que uma Company fique sem ao menos um ADMIN ativo.
- **FR-008**: Ao cadastrar um usuário, o ADMIN MUST definir uma senha inicial, que ele repassa à
  pessoa por conta própria. O primeiro ADMIN recebe a senha inicial do procedimento de
  provisionamento (FR-002).
- **FR-008a**: Enquanto usar uma senha inicial ou redefinida, o usuário MUST ser obrigado a
  cadastrar uma senha nova no primeiro login, antes de acessar qualquer outra funcionalidade. A
  senha nova MUST ser diferente da inicial.
- **FR-008b**: Senhas MUST ter no mínimo 8 caracteres.

**Autenticação**

- **FR-009**: Usuários MUST se autenticar com e-mail e senha.
- **FR-010**: Senhas MUST ser armazenadas de forma irreversível e MUST NOT aparecer em respostas,
  logs ou mensagens de erro.
- **FR-011**: Falhas de login MUST exibir a mesma mensagem, exista ou não o e-mail informado.
- **FR-012**: Após 5 tentativas incorretas seguidas para o mesmo e-mail, novas tentativas MUST ser
  bloqueadas por 15 minutos.
- **FR-013**: O painel Admin MUST aceitar apenas usuários ADMIN; o aplicativo Mobile MUST aceitar
  apenas DRIVER e PASSENGER.
- **FR-014**: A sessão do painel MUST expirar após 8 horas; a sessão do aplicativo MUST permanecer
  válida entre aberturas do app por até 30 dias. Em ambos, sair encerra a sessão imediatamente.
- **FR-015**: Usuário ou Company desativados MUST perder o acesso na próxima interação, mesmo com
  sessão ainda dentro do prazo.
- **FR-016**: Não existe recuperação de senha pelo próprio usuário ("esqueci minha senha") nesta
  feature. Quem esquecer a senha pede ao ADMIN da empresa, que MUST poder redefini-la para uma senha
  provisória; a troca no login seguinte segue FR-008a. Nenhum e-mail é enviado pelo sistema.
- **FR-016a**: Ao redefinir a senha de um usuário, as sessões abertas dele MUST deixar de valer.

**Isolamento e autorização**

- **FR-017**: A empresa e o role usados em qualquer operação MUST ser os do usuário autenticado;
  valores de empresa ou role enviados pelo cliente MUST ser ignorados.
- **FR-018**: Toda consulta ou alteração de dados de empresa MUST ser restrita à Company do usuário
  autenticado. Acesso a um registro de outra Company MUST falhar da mesma forma que um registro
  inexistente.
- **FR-019**: Toda decisão de autorização MUST acontecer no servidor. Esconder ações na interface é
  permitido, mas nunca suficiente.
- **FR-020**: Toda entrada vinda do painel ou do aplicativo MUST ser validada no servidor antes de
  qualquer efeito.
- **FR-021**: O isolamento entre empresas e a autorização por role MUST ser cobertos por testes
  automatizados (Constitution, Princípio VII) — são os comportamentos de maior risco desta feature.

**Escopo**

- **FR-022**: Esta feature MUST NOT criar rotas, viagens, veículos, confirmação de presença,
  notificações ou qualquer funcionalidade operacional de transporte.
- **FR-023**: As telas iniciais do painel e do aplicativo após o login MUST se limitar a identificar
  o usuário, a empresa e o papel, com a opção de sair (e, no painel, o acesso à gestão de pessoas).

### Key Entities *(include if feature involves data)*

- **Company**: empresa cliente do VemVan. Tem nome e situação (ativa/desativada). É a fronteira de
  isolamento: todo dado de negócio pertence a exatamente uma Company.
- **User**: pessoa que usa o sistema. Pertence a exatamente uma Company; tem nome, e-mail único,
  role (ADMIN, DRIVER ou PASSENGER), situação (ativo/desativado) e uma credencial de acesso que
  nunca é exposta. Sabe-se se a senha atual é provisória (inicial ou redefinida pelo ADMIN), o que
  obriga a troca no próximo login.
- **Session**: o acesso vigente de um User a partir do painel ou do aplicativo. Tem prazo de
  validade, deixa de valer ao sair, e é sempre reavaliada contra a situação atual do User e da
  Company.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um ADMIN entra no painel e chega à lista de pessoas da empresa em menos de 1 minuto.
- **SC-002**: Um ADMIN cadastra uma nova pessoa em menos de 2 minutos.
- **SC-003**: Motorista ou passageiro entra no aplicativo em menos de 1 minuto no primeiro acesso, e
  sem digitar credenciais nas aberturas seguintes dentro do prazo da sessão.
- **SC-004**: Em uma verificação com duas empresas, **100%** das tentativas de ler, alterar ou
  desativar dados da outra empresa falham, inclusive com identificadores manipulados — 0 vazamentos.
- **SC-005**: **100%** das tentativas de usar o painel com DRIVER/PASSENGER, ou o aplicativo com
  ADMIN, são negadas.
- **SC-006**: Uma pessoa desativada perde o acesso na primeira interação após a desativação, em
  100% dos casos verificados.
- **SC-007**: Nenhuma senha aparece em claro em respostas, logs ou armazenamento em qualquer
  verificação realizada.

## Assumptions

- Cada pessoa pertence a uma única empresa. Uma mesma pessoa em duas empresas precisaria de dois
  cadastros com e-mails diferentes; suporte a múltiplas empresas por pessoa fica fora desta feature.
- O ADMIN usa apenas o painel, e DRIVER/PASSENGER apenas o aplicativo. Um ADMIN que também dirige
  precisaria de um segundo cadastro; papéis acumulados ficam fora desta feature.
- O e-mail é o identificador de login porque todos os usuários são funcionários de empresas, que
  normalmente têm e-mail corporativo. Login por telefone, SSO corporativo ou login social ficam fora.
- Os prazos de sessão (8 horas no painel, 30 dias no aplicativo) e o bloqueio de login (5 tentativas,
  15 minutos) seguem padrões usuais de mercado para painel administrativo e app móvel de uso
  frequente, e podem ser ajustados na clarificação.
- Criar, desativar e reativar empresas é tarefa da equipe VemVan pelo procedimento de
  provisionamento (FR-002, FR-002a); não há tela para isso nesta feature.
- A senha inicial e a senha provisória chegam à pessoa por fora do sistema (o ADMIN repassa). É um
  trade-off aceito para não depender de envio de e-mail agora; convite e recuperação por e-mail
  podem virar uma feature própria.
- A feature 001 (fundação) está concluída: servidor, painel e aplicativo já sobem, e só o servidor
  acessa os dados. A estrutura provisória de verificação criada pela feature 001 é descartada aqui,
  por ser a primeira feature com dados de negócio (dívida registrada na feature 001).
