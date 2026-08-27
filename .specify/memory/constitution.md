<!--
SYNC IMPACT REPORT
Version change: [CONSTITUTION_VERSION] (unfilled template) → 1.0.0
Bump rationale: MAJOR — initial ratification; all placeholders replaced with concrete governance.

Modified principles:
- [PRINCIPLE_1_NAME] → I. Spec Antes da Implementação (NON-NEGOTIABLE)
- [PRINCIPLE_2_NAME] → II. Escopo Mínimo e Simplicidade Deliberada
- [PRINCIPLE_3_NAME] → III. TypeScript e Idioma do Código
- [PRINCIPLE_4_NAME] → IV. Isolamento Multi-Tenant e Autorização no Backend (NON-NEGOTIABLE)
- [PRINCIPLE_5_NAME] → V. Camadas Explícitas Sem Burocracia
Added principles (beyond the 5-principle scaffold):
- VI. Integridade do Modelo de Domínio
- VII. Testes Guiados por Risco

Added sections:
- Stack e Restrições Tecnológicas (from [SECTION_2_NAME]/[SECTION_2_CONTENT])
- Fluxo de Desenvolvimento (from [SECTION_3_NAME]/[SECTION_3_CONTENT])

Removed sections: none

Deferred TODOs: none
-->

# VemVan Constitution

VemVan é uma plataforma de transporte corporativo que conecta empresas (Company), administradores,
motoristas e passageiros. Esta constitution define princípios duradouros de engenharia. Ela descreve
COMO construímos, não O QUE construímos: nenhuma regra aqui autoriza, por si só, a implementação de
qualquer feature.

## Core Principles

### I. Spec Antes da Implementação (NON-NEGOTIABLE)

Nenhuma feature relevante é implementada sem uma spec aprovada. O fluxo é
Specification → Clarification (quando necessário) → Plan → Tasks → Analysis (quando necessário) →
Implementation → Validation.

- A implementação MUST se limitar ao que está descrito na spec ativa.
- Cada feature MUST ter escopo pequeno, testável e validável de forma independente.
- Uma feature MUST ser validada antes que a próxima comece.
- Funcionalidade não prevista na spec atual MUST NOT ser implementada, mesmo que a arquitetura já
  permita ou que o esforço adicional pareça trivial.

**Rationale**: O produto é construído de forma incremental. Trabalho fora da spec não pode ser
revisado nem validado, e transforma escopo indefinido em dívida permanente.

### II. Escopo Mínimo e Simplicidade Deliberada

Código simples, legível e sustentável tem prioridade sobre generalidade antecipada.

- Abstrações MUST ser introduzidas quando resolvem um problema concreto já existente, nunca por
  antecipação ou formalidade.
- Dependências novas MUST ter necessidade clara justificada na spec ou no plan que as introduz.
- Bibliotecas previstas para o futuro (mapas, localização, notificações, sockets) MUST ser
  adicionadas apenas na feature que efetivamente as utiliza.
- Mudanças arquiteturais significativas MUST ser justificadas e aprovadas antes de serem executadas.
- O monorepo MUST permanecer simples: ferramental adicional exige justificativa explícita.

**Rationale**: Cada abstração e dependência prematura aumenta o custo de toda feature seguinte, sem
benefício verificável no presente.

### III. TypeScript e Idioma do Código

- Todas as aplicações MUST ser escritas em TypeScript.
- Código, nomes de variáveis, classes, arquivos, entidades, propriedades, tabelas e colunas MUST
  estar em inglês.
- Textos apresentados ao usuário final MAY estar em português.

**Rationale**: Tipagem estática e vocabulário único no código eliminam ambiguidade entre camadas
(API, mobile, admin, banco) e entre pessoas que trabalham no projeto.

### IV. Isolamento Multi-Tenant e Autorização no Backend (NON-NEGOTIABLE)

VemVan é multi-tenant. Uma Company representa uma empresa cliente.

- Dados de uma Company MUST NOT ser acessíveis por outra Company, em nenhuma superfície.
- Toda entidade pertencente a uma empresa MUST carregar e respeitar `companyId`.
- Quando `companyId`, role ou permissão puder ser derivado do usuário autenticado, o valor enviado
  pelo cliente MUST ser ignorado.
- Autorização MUST acontecer no backend. O frontend MAY esconder ações, mas nunca é a fonte da
  decisão.
- Toda entrada externa MUST ser validada no backend via DTOs; dados vindos do frontend MUST NOT ser
  considerados confiáveis.
- O frontend MUST NOT acessar o banco diretamente. O único caminho é
  Mobile/Admin → NestJS API → Sequelize → PostgreSQL.
- Segredos MUST existir apenas em variáveis de ambiente. Arquivos `.env` com credenciais MUST NOT
  ser commitados, e credenciais administrativas (incluindo Service Role Keys) MUST NOT ser expostas
  a aplicações frontend.

**Rationale**: Vazamento entre tenants ou escalada de privilégio é o risco mais grave do produto e
não é recuperável depois que acontece.

### V. Camadas Explícitas Sem Burocracia

O backend segue Controller → Service/Use Case → Repository → Sequelize → PostgreSQL.

- Controllers MUST ser pequenos: receber request, validar entrada, chamar a camada de aplicação e
  retornar response. Regras de negócio complexas MUST NOT viver no controller.
- Repositories MUST ser a única camada responsável por persistência.
- Interfaces, repositories ou camadas adicionais MUST NOT ser criados apenas por formalidade; a
  separação existe quando traz clareza real. Clean Architecture burocrática é explicitamente
  rejeitada.

Os frontends usam MVVM (Model, View, ViewModel, Binder) quando houver lógica de apresentação
significativa.

- A View MUST se limitar a apresentação e eventos de interface; MUST NOT acessar APIs, conter regras
  de negócio ou conhecer infraestrutura.
- A ViewModel MUST concentrar estado de tela, comportamento, loading, erros, transformação de dados
  e comunicação com services/use cases; MUST NOT conter JSX.
- O Binder conecta View e ViewModel, cria a ViewModel e injeta dependências; MUST permanecer simples
  e MUST NOT acumular regras de negócio.
- MVVM MUST NOT ser aplicado a componentes puramente visuais.
- O código MUST ser organizado por feature (ex.: `features/passenger/home/`, com
  `PassengerHomeView.tsx`, `PassengerHomeViewModel.ts` e `PassengerHome.tsx` como Binder).

**Rationale**: Fronteiras claras tornam o comportamento testável sem UI e sem rede; camadas vazias
apenas adicionam ruído.

### VI. Integridade do Modelo de Domínio

- Route representa a configuração permanente de uma rota. Trip representa a execução dessa rota em
  uma data. Route e Trip MUST NOT ser tratados como a mesma entidade.
- Uma Route MAY definir motorista e veículo padrão; uma Trip MUST registrar o motorista e o veículo
  efetivamente utilizados, permitindo substituição sem alterar a Route.
- TripPassenger MUST preservar as informações relevantes do passageiro naquela viagem, de modo que
  alterações futuras no cadastro não destruam o histórico.
- Os roles do sistema são ADMIN, DRIVER e PASSENGER. User é a entidade genérica de usuário;
  PASSENGER é o role dos funcionários transportados, e USER MUST NOT ser usado como role.

**Rationale**: Confundir configuração com execução, ou deixar o histórico depender de dados mutáveis,
corrompe silenciosamente registros passados de forma irreversível.

### VII. Testes Guiados por Risco

- Features críticas MUST ser projetadas de forma testável (lógica separada de UI, rede e framework).
- Testes MUST priorizar os comportamentos de maior risco: isolamento multi-tenant, autorização por
  role, confirmação de presença, limite de horário, transições de status de viagem, início e
  finalização de trajeto e ausência de notificações duplicadas.
- Cobertura percentual MUST NOT ser um objetivo em si; testes escritos apenas para elevar o número
  são desperdício.

**Rationale**: Testes existem para proteger o que causa dano real quando quebra, não para satisfazer
uma métrica.

## Stack e Restrições Tecnológicas

Monorepo, mantido simples:

```
apps/
  api/
  mobile/
  admin/
packages/
  shared/
```

- **API**: Node.js, NestJS, TypeScript, Sequelize, PostgreSQL. Sequelize é o ORM do projeto.
  Prisma MUST NOT ser introduzido. Migrations MUST ser versionadas; `sequelize.sync()` MUST NOT ser
  usado como estratégia de gerenciamento de banco em produção. DTOs com validação adequada do
  NestJS (class-validator / class-transformer quando aplicável) MUST cobrir toda entrada externa.
- **Mobile**: React Native, Expo, TypeScript.
- **Admin Web**: Next.js, TypeScript, Tailwind CSS e shadcn/ui. shadcn/ui é a biblioteca de
  componentes principal do painel; componentes complexos MUST NOT ser construídos do zero quando um
  componente do shadcn/ui puder ser usado ou adaptado.
- **Banco**: PostgreSQL. Em ambiente hospedado, o PostgreSQL do Supabase é usado inicialmente
  apenas como provedor de banco. Supabase Auth, Realtime, Storage e Edge Functions MUST NOT ser
  adotados sem decisão arquitetural explícita, e a aplicação MUST permanecer desacoplada do Supabase
  para permitir troca de provedor. Desenvolvimento local MAY usar PostgreSQL via Docker.

Substituir qualquer item desta stack é uma mudança arquitetural significativa e segue o Princípio II.

## Fluxo de Desenvolvimento

- Toda feature relevante percorre o ciclo do Princípio I antes de qualquer código.
- Plan e Tasks MUST declarar explicitamente novas dependências, novas tabelas/migrations e qualquer
  desvio destes princípios.
- Um PR MUST corresponder a uma feature com escopo definido; mudanças oportunistas fora da spec MUST
  ser extraídas para uma spec própria.
- O contexto de MVP e os itens fora do MVP (pagamentos, chat, avaliações, IA, gamificação, dashboard
  financeiro, relatórios avançados, otimização avançada de rota, compartilhamento público de
  localização) são informação de produto, não autorização de implementação.

## Governance

Esta constitution prevalece sobre práticas, hábitos e preferências individuais. Em caso de conflito
entre esta constitution e uma spec, plan ou task, a constitution vence e o artefato é corrigido.

- **Emendas**: alterações MUST ser propostas por escrito, com justificativa e impacto sobre features
  em andamento, e aprovadas antes de entrar em vigor.
- **Versionamento** (semver): MAJOR para remoção ou redefinição incompatível de princípios; MINOR
  para novo princípio ou expansão material de orientação; PATCH para clarificações e ajustes
  não semânticos.
- **Conformidade**: revisões de spec, plan e código MUST verificar aderência aos princípios.
  Complexidade adicional MUST ser justificada explicitamente; sem justificativa aceita, ela é
  removida.
- **Exceções**: qualquer desvio MUST ser registrado na spec ou plan da feature, com motivo e escopo
  limitado. Desvios aos princípios I e IV não são permitidos.

**Version**: 1.0.0 | **Ratified**: 2026-08-27 | **Last Amended**: 2026-08-27
