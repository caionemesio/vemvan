# Contract — `GET /health`

**Feature**: 001-project-foundation | **Consumers**: nenhum ainda (uso manual e scripts de validação)

Único contrato externo exposto por esta feature. Existe para tornar FR-005 verificável de fora da
aplicação. **Não é feature de produto**: não expõe dados, não tem autenticação e não deve ser
consumido pelo Admin nem pelo Mobile nesta feature.

## Request

```
GET /health
```

Sem parâmetros, sem headers obrigatórios, sem autenticação.

## Response — 200 OK

Banco acessível.

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Response — 503 Service Unavailable

A API está de pé, mas `sequelize.authenticate()` falhou no momento da chamada (por exemplo, o banco
caiu depois do boot).

```json
{
  "status": "error",
  "database": "disconnected"
}
```

## Regras

- O handler MUST executar uma verificação real de conectividade a cada chamada
  (`sequelize.authenticate()`), nunca retornar um valor memorizado do boot.
- A resposta MUST NOT incluir host, usuário, senha, nome do banco, string de conexão ou stack trace.
  Vazar topologia por um endpoint sem autenticação é risco desnecessário.
- O corpo MUST se limitar aos dois campos acima. Uptime, versão e métricas ficam para quando houver
  quem consuma.

## Fora deste contrato

- Endpoints de readiness/liveness separados.
- Qualquer outra rota HTTP. A API desta feature expõe **apenas** `GET /health`.

## Relação com a falha rápida no boot

Este endpoint cobre o cenário "API no ar". O cenário "banco fora do ar na inicialização" **não é
coberto por ele**: nesse caso a API encerra antes de servir qualquer requisição, com erro explícito
no processo (FR-005, decisão de clarify nº 2). São duas evidências distintas, e o `quickstart.md`
verifica as duas.
