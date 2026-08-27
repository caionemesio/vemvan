# Feature Specification: Project Foundation

**Feature Branch**: `001-project-foundation`

**Created**: 2026-08-27

**Status**: Draft

**Input**: User description: "Quero criar a primeira feature do VemVan: Project Foundation. O objetivo desta feature é preparar somente a fundação técnica do projeto para que as próximas features possam ser desenvolvidas incrementalmente. Não implemente nenhuma regra de negócio do VemVan nesta feature."

## Contexto

Esta feature entrega exclusivamente a fundação técnica do monorepo VemVan. Ela não implementa
nenhuma regra de negócio, entidade de domínio ou fluxo de produto.

O "usuário" desta feature é a pessoa desenvolvedora do VemVan. O valor entregue é a capacidade de
começar a próxima feature de produto sem precisar tomar decisões de infraestrutura.

A stack (NestJS, Sequelize, PostgreSQL, Expo, Next.js, Tailwind, shadcn/ui, TypeScript) não é uma
decisão desta spec: ela é imposta pela Constitution do projeto e aparece aqui como restrição, não
como escolha de implementação.

## Clarifications

### Session 2026-08-27

- Q: As variáveis de ambiente devem ficar em um único arquivo na raiz do monorepo, ou cada aplicação deve ter o seu próprio arquivo? → A: Um arquivo de ambiente por aplicação (Opção B)
- Q: Quando a API é iniciada e o PostgreSQL está indisponível, ela deve falhar imediatamente e encerrar, ou subir mesmo assim? → A: Falha rápida — valida a conexão no boot e encerra com erro explícito (Opção A)
- Q: O arquivo `CLAUDE.md` faz parte do que deve ser entregue nesta feature? → A: Sim — criar um `CLAUDE.md` conciso com as regras operacionais do repositório, referenciando a Constitution como fonte de verdade (Opção A)
- Q: A migration técnica mínima deve criar e remover uma tabela descartável, ou ser uma migration sem efeito no schema? → A: Cria uma tabela descartável e sem domínio, removida na reversão (Opção A)
- Q: O que conta como prova de que o Mobile funciona — abrir o app em um alvo, ou apenas o bundle compilar? → A: O app precisa abrir e exibir a tela inicial em pelo menos um alvo, à escolha de quem valida (Opção A)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API conectada ao PostgreSQL local (Priority: P1)

Uma pessoa desenvolvedora clona o repositório, sobe o banco local, executa as migrations e inicia a
API. A API sobe sem erros e confirma que está efetivamente conectada ao PostgreSQL.

**Why this priority**: É a fatia que carrega o maior risco técnico (workspace, banco, ORM,
migrations, configuração por ambiente). Se apenas esta história for entregue, a próxima feature de
backend já pode começar.

**Independent Test**: Subir o banco local, rodar as migrations, iniciar a API e verificar o estado
de conexão reportado pela própria aplicação — sem depender de Admin, Mobile ou do package
compartilhado.

**Acceptance Scenarios**:

1. **Given** o repositório recém-clonado e as dependências instaladas, **When** a pessoa
   desenvolvedora sobe o PostgreSQL local pelo script da raiz, **Then** o banco fica acessível com
   as credenciais definidas no arquivo de ambiente local.
2. **Given** o PostgreSQL local no ar e as variáveis de ambiente configuradas, **When** as
   migrations são executadas, **Then** elas aplicam com sucesso e o histórico de migrations
   aplicadas fica registrado no banco.
3. **Given** as migrations aplicadas, **When** a API é iniciada, **Then** ela sobe sem erros e
   expõe um estado de saúde indicando que a conexão com o banco está ativa.
4. **Given** o banco fora do ar ou credenciais incorretas, **When** a API é iniciada, **Then** ela
   encerra imediatamente com uma mensagem de erro explícita e compreensível, sem subir em estado
   degradado e sem falha silenciosa.
5. **Given** a migration técnica aplicada e sua tabela presente no banco, **When** a pessoa
   desenvolvedora executa a reversão, **Then** a tabela deixa de existir e o histórico é atualizado.
6. **Given** qualquer estado do projeto, **When** o schema do banco é alterado, **Then** a
   alteração só ocorre por migration versionada — nunca por sincronização automática de schema.

---

### User Story 2 - Painel Admin inicial no ar (Priority: P2)

Uma pessoa desenvolvedora inicia o painel administrativo pelo script da raiz e vê uma página
inicial simples do VemVan, com o sistema de estilo e a biblioteca de componentes já configurados.

**Why this priority**: Desbloqueia todas as features de painel. Depende apenas de si mesma e do
workspace, não do backend.

**Independent Test**: Iniciar apenas o Admin (sem banco e sem API) e abrir a página inicial no
navegador.

**Acceptance Scenarios**:

1. **Given** as dependências instaladas, **When** o Admin é iniciado pelo script da raiz,
   **Then** ele sobe sem erros e serve uma página inicial identificando o VemVan.
2. **Given** o Admin no ar, **When** a página inicial é aberta, **Then** os estilos utilitários são
   aplicados corretamente e ao menos um componente da biblioteca de componentes padrão é
   renderizado, comprovando que a configuração está funcional.
3. **Given** o Admin configurado, **When** a verificação de tipos e o build são executados,
   **Then** ambos concluem sem erros originados da configuração criada.

---

### User Story 3 - Aplicativo Mobile inicial no ar (Priority: P3)

Uma pessoa desenvolvedora inicia o aplicativo mobile pelo script da raiz e vê uma tela inicial
simples indicando que o VemVan está funcionando.

**Why this priority**: Desbloqueia as features de mobile, mas não bloqueia nenhuma outra parte da
fundação.

**Independent Test**: Iniciar apenas o Mobile e abrir o app em um alvo à escolha de quem valida —
emulador, dispositivo físico ou navegador.

**Acceptance Scenarios**:

1. **Given** as dependências instaladas, **When** o Mobile é iniciado pelo script da raiz,
   **Then** o ambiente de desenvolvimento sobe sem erros.
2. **Given** o ambiente de desenvolvimento no ar, **When** o app é aberto em qualquer um dos alvos
   suportados, **Then** uma tela inicial simples do VemVan é apresentada. Compilar o bundle sem
   abrir o app não é suficiente para considerar a história validada.
3. **Given** o Mobile configurado, **When** a verificação de tipos é executada, **Then** ela
   conclui sem erros originados da configuração criada.

---

### User Story 4 - Package compartilhado disponível (Priority: P4)

Uma pessoa desenvolvedora consegue importar código do package compartilhado a partir de qualquer
aplicação do monorepo, sem configuração adicional.

**Why this priority**: Sem isso, a primeira feature que precisar compartilhar um contrato entre API
e clientes terá de resolver o problema de workspace no meio do caminho. Vale entregar agora, mas é
o item de menor risco.

**Independent Test**: Importar um valor trivial do package compartilhado em uma aplicação e rodar a
verificação de tipos.

**Acceptance Scenarios**:

1. **Given** as dependências instaladas, **When** uma aplicação importa algo do package
   compartilhado, **Then** a importação resolve corretamente e a verificação de tipos passa.
2. **Given** o package compartilhado, **When** seu conteúdo é inspecionado, **Then** ele não contém
   tipos, contratos ou constantes de domínio do VemVan criados antecipadamente.

---

### User Story 5 - Onboarding documentado (Priority: P5)

Uma pessoa desenvolvedora que nunca viu o projeto consegue, seguindo apenas o README, sair do clone
até ter API, Admin e Mobile rodando localmente.

**Why this priority**: Depende de tudo o que as histórias anteriores entregam, então é naturalmente
a última. É também o que torna a fundação verificável por outra pessoa.

**Independent Test**: Uma pessoa sem contexto prévio segue o README em uma máquina limpa e chega ao
fim sem precisar de informação externa.

**Acceptance Scenarios**:

1. **Given** o repositório clonado, **When** a pessoa segue o README na ordem, **Then** ela
   consegue instalar dependências, configurar variáveis de ambiente, subir o banco, rodar
   migrations e iniciar API, Admin e Mobile.
2. **Given** o repositório, **When** os arquivos de exemplo de variáveis de ambiente de cada
   aplicação são consultados, **Then** todas as variáveis daquela aplicação estão documentadas,
   com valores de exemplo e sem nenhuma credencial real.
3. **Given** o repositório, **When** o versionamento é inspecionado, **Then** arquivos de ambiente
   com credenciais, dependências instaladas e artefatos de build não estão versionados.
4. **Given** o repositório, **When** o `CLAUDE.md` é consultado, **Then** ele descreve as regras
   operacionais do repositório e aponta para a Constitution, sem duplicar seu conteúdo.

---

### Edge Cases

- O que acontece quando a API inicia com o PostgreSQL fora do ar? Ela encerra na inicialização com
  erro explícito e diagnosticável. Quedas do banco depois que a API já subiu estão fora do escopo
  desta feature.
- O que acontece quando variáveis de ambiente obrigatórias estão ausentes ou inválidas? A aplicação
  deve falhar cedo, indicando qual variável está faltando, em vez de subir em estado inconsistente.
- O que acontece quando alguém tenta apontar a aplicação para um PostgreSQL hospedado (por exemplo,
  o fornecido pelo Supabase)? Deve bastar trocar variáveis de ambiente, sem alteração de código.
- O que acontece quando a mesma migration é executada duas vezes? A execução deve ser idempotente:
  migrations já aplicadas não são reaplicadas.
- O que acontece quando a porta do PostgreSQL local já está ocupada na máquina? O conflito deve ser
  contornável por variável de ambiente, sem editar arquivos versionados.

## Requirements *(mandatory)*

### Functional Requirements

**Monorepo e workspace**

- **FR-001**: O repositório MUST ser um monorepo com as aplicações `api`, `mobile` e `admin` sob
  `apps/`, e o package compartilhado sob `packages/shared/`.
- **FR-002**: O monorepo MUST usar uma estratégia de workspaces simples e estável, sem ferramental
  adicional que não traga benefício demonstrável nesta fase.
- **FR-003**: A raiz MUST expor scripts para: iniciar a API, iniciar o Admin, iniciar o Mobile,
  subir o PostgreSQL local, parar o PostgreSQL local, executar migrations e reverter a última
  migration.
- **FR-004**: Todas as aplicações e o package compartilhado MUST usar TypeScript, com verificação
  de tipos executável.

**API e banco de dados**

- **FR-005**: A API MUST validar a conexão com o PostgreSQL durante a inicialização. Se o banco
  não responder, a API MUST encerrar com uma mensagem de erro explícita, em vez de subir em estado
  degradado. Com o banco disponível, a API MUST iniciar sem erros e MUST expor o estado da conexão
  de forma verificável externamente.
- **FR-006**: A API MUST usar Sequelize como ORM; Prisma MUST NOT ser introduzido.
- **FR-007**: O schema do banco MUST ser gerenciado exclusivamente por migrations versionadas;
  sincronização automática de schema (`sequelize.sync()`) MUST NOT ser usada.
- **FR-008**: O sistema de migrations MUST suportar aplicação e reversão, e MUST registrar quais
  migrations já foram aplicadas.
- **FR-009**: O projeto MUST incluir exatamente uma migration técnica mínima que crie uma tabela
  descartável, sem qualquer significado de domínio, e a remova na reversão. Seu único propósito é
  tornar observável que aplicação e reversão funcionam. Ela MUST NOT modelar nenhuma entidade de
  domínio e MUST ser removida quando a primeira migration de domínio existir.
- **FR-010**: Toda a configuração de banco MUST vir de variáveis de ambiente lidas do arquivo de
  ambiente da própria aplicação; nenhum valor de conexão MUST ser fixado em código.
- **FR-011**: O código MUST permanecer independente de qualquer provedor específico de PostgreSQL:
  apontar a aplicação para um banco hospedado MUST exigir apenas mudança de variáveis de ambiente.
- **FR-012**: O ambiente de desenvolvimento local MUST fornecer PostgreSQL via Docker Compose, com
  dados persistidos entre reinícios do contêiner.

**Admin**

- **FR-013**: O Admin MUST iniciar sem erros e apresentar uma página inicial simples identificando
  o VemVan.
- **FR-014**: O Admin MUST ter Tailwind CSS e shadcn/ui configurados e comprovadamente funcionais
  na página inicial.

**Mobile**

- **FR-015**: O Mobile MUST iniciar sem erros e apresentar uma tela inicial simples indicando que o
  VemVan está funcionando, aberta em pelo menos um alvo — emulador, dispositivo físico ou navegador
  — à escolha de quem valida.

**Package compartilhado**

- **FR-016**: O package `shared` MUST ser importável pelas aplicações do monorepo, com resolução de
  tipos funcionando.
- **FR-017**: O package `shared` MUST NOT conter tipos, contratos ou constantes de domínio criados
  antecipadamente apenas para preenchê-lo.

**Ambiente e documentação**

- **FR-018**: Cada aplicação que exigir configuração MUST ter o seu próprio arquivo de ambiente,
  acompanhado de um arquivo de exemplo versionado que documente todas as variáveis daquela
  aplicação, sem nenhuma credencial real. Um arquivo de ambiente único na raiz MUST NOT ser usado.
- **FR-019**: As credenciais do PostgreSQL local usadas pelo Docker Compose MUST ser mantidas
  consistentes com as consumidas pela API, e a origem dessa configuração MUST estar documentada no
  README para que a divergência entre os dois seja evitável.
- **FR-020**: O repositório MUST ter configuração de ignore que impeça o versionamento de arquivos
  de ambiente com credenciais, dependências instaladas e artefatos de build.
- **FR-021**: O README MUST permitir que outra pessoa desenvolvedora vá do clone até API, Admin e
  Mobile rodando, seguindo apenas as instruções documentadas.
- **FR-022**: O repositório MUST conter um `CLAUDE.md` conciso na raiz, com as regras operacionais
  do repositório (estrutura, scripts, restrições de stack) e referenciando a Constitution como
  fonte de verdade. Ele MUST NOT duplicar o conteúdo da Constitution nem do README.

**Limites de escopo**

- **FR-023**: Esta feature MUST NOT criar as entidades Company, User, Vehicle, Route, Trip ou
  TripPassenger, nem qualquer outra entidade de domínio.
- **FR-024**: Esta feature MUST NOT implementar autenticação, autorização, roles, JWT ou qualquer
  regra de negócio do VemVan.
- **FR-025**: Esta feature MUST NOT adicionar bibliotecas de mapas, localização, notificações push
  ou comunicação em tempo real.
- **FR-026**: As telas iniciais de Admin e Mobile MUST permanecer estáticas e MUST NOT receber
  estruturas MVVM artificiais, por não possuírem estado ou comportamento significativos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A partir de um clone limpo, seguindo apenas o README, uma pessoa desenvolvedora
  coloca banco, API, Admin e Mobile em funcionamento em menos de 30 minutos, sem consultar outra
  pessoa e sem informação externa ao repositório.
- **SC-002**: Instalação de dependências, subida do banco, execução das migrations, inicialização
  da API, do Admin e do Mobile concluem com 0 erros na sequência documentada, com a página inicial
  do Admin e a tela inicial do Mobile efetivamente visíveis.
- **SC-003**: Com o banco no ar, a aplicação sobe e reporta a conexão como ativa; com o banco fora
  do ar, a inicialização termina com erro explícito. Ambos os cenários são verificáveis executando
  a API com o banco ligado e desligado.
- **SC-004**: A migration técnica pode ser aplicada e revertida em sequência: após aplicar, a
  tabela descartável existe no banco; após reverter, ela não existe mais. O histórico de migrations
  reflete corretamente cada uma das duas operações.
- **SC-005**: Apontar a aplicação para um PostgreSQL diferente exige alteração apenas de variáveis
  de ambiente, com 0 arquivos de código modificados.
- **SC-006**: As verificações de tipos e os builds pertinentes das três aplicações e do package
  compartilhado concluem com 0 erros originados da configuração criada.
- **SC-007**: Nenhuma credencial real está versionada no repositório, verificável por inspeção do
  conteúdo versionado.
- **SC-008**: O repositório contém 0 entidades de domínio, 0 rotas autenticadas e 0 regras de
  negócio do VemVan ao final da feature.

## Assumptions

- A "validação de conexão" da API será exposta como um endpoint de saúde consultável, por ser a
  forma testável e observável de comprovar o critério "confirmar conexão entre API e banco". Ele
  não é uma feature de produto e não expõe dados.
- Reagir a quedas do banco após a inicialização (reconexão, health check contínuo, readiness para
  orquestrador) está fora do escopo. A decisão de falha rápida vale para o ambiente de
  desenvolvimento local e pode ser revisitada quando existir ambiente hospedado.
- A migration técnica mínima é considerada necessária: sem ao menos uma migration com efeito
  observável no schema não há como comprovar que aplicação, reversão e registro de histórico
  funcionam. A tabela que ela cria é descartável por construção e será removida junto com a própria
  migration quando a primeira migration de domínio existir.
- A escolha específica de package manager, estratégia de workspaces, nomes exatos dos scripts da
  raiz e ferramenta de execução de migrations fica deferida ao `/speckit-plan`, conforme indicado
  pelo autor da feature.
- A estrutura de diretórios proposta (`apps/`, `packages/`, `docker-compose.yml`, `README.md`,
  `CLAUDE.md`) pode ser ajustada no planejamento mediante justificativa técnica, desde que respeite
  a Constitution. Os arquivos de exemplo de ambiente ficam junto de cada aplicação, não na raiz.
- Não haverá integração entre as aplicações nesta feature: o Admin e o Mobile não consomem a API.
  Cada aplicação sobe e é validada isoladamente.
- Não haverá pipeline de CI, deploy, containerização das aplicações ou ambiente hospedado nesta
  feature. O escopo é o ambiente de desenvolvimento local.
- Testes automatizados não são um entregável desta feature: não há comportamento de negócio a
  testar. A verificação é a execução manual dos critérios de sucesso. A Constitution exige testes
  para features críticas de domínio, que começam na próxima feature.
- O ambiente de desenvolvimento local pressupõe Docker disponível na máquina.
