# Plan — loteria

## 1. Visão geral

- **Nome:** loteria (coletor/analisador de loterias da Caixa)
- **Descrição:** utilitário Node 22+ (`lotofacil.js`, CommonJS + node-fetch) que coleta os resultados oficiais das loterias da Caixa e mantém históricos locais `.txt` para análise (lotofácil, megasena, lotomania, dia de sorte). Variantes experimentais preservadas em `archive/`.
- **Problema que resolve:** automatizar a atualização dos históricos oficiais para estudos de frequência sem scraping HTML frágil — usa a API pública da Caixa com timeout e tolerância a linhas inválidas.
- **Público-alvo:** uso pessoal/didático; vitrine de tratamento de dados públicos com resiliência.
- **Estado atual:** todos os itens do `MELHORIAS.md` de 2026-10-11 concluídos; CI (DEVOPS-03) executada nesta sessão.

## 2. Arquitetura e tecnologias

- Node ≥ 22, CommonJS, única dependência: `node-fetch` 3.x.
- `Dockerfile` + `compose.yaml` (imagem reproduzível via `npm ci`, volume bind para os `.txt`).
- Dados locais: `lotofacil.txt`, `megasena.txt`, `lotomania.txt`, `diadesorte.txt`, `erros_lotofacil.txt`, `output/jogos.txt` — nenhum banco de dados.
- **Limitações:** dependência da disponibilidade/formato da API pública da Caixa; execução interativa (tty) pelo Compose.

## 3. Funcionalidades existentes

- [x] Coleta oficial com timeout de 15s e diagnóstico de aborto (BUG-01).
- [x] Tolerância a linhas inválidas + backup antes da primeira escrita (SEC-01).
- [x] Instalação Docker reproduzível apenas com `npm ci` (DEVOPS-02); `node_modules` fora do índice (DEVOPS-01).
- [x] Variantes legadas preservadas em `archive/` (IMP-01); README alinhado (DOC-01).
- [ ] Suíte de testes — TEST-01 pendente por regra vigente.
- [ ] CI — **implementada nesta sessão** (estática).

## 4. Objetivos futuros

- **OBJ-01 (P2, concluído nesta sessão):** DEVOPS-03 — CI estática (sintaxe, npm ci/audit, Compose config, diff).
- **OBJ-02 (P3):** TEST-01 — testes do parser dos `.txt` e da lógica de merge, com fixture pequena, quando testes forem liberados.
- **OBJ-03 (P3):** migrar para ESM (`"type": "module"` já é possível em Node 22+) ou declarar CommonJS definitivamente; hoje `node-fetch@3` em CJS exige `import()` dinâmico — revisitar.
- **OBJ-04 (P3):** agendamento (cron/systemd timer) documentado para atualização periódica dos históricos.

## 5. Melhorias técnicas

- **Infraestrutura:** ✅ CI estática criada; Compose validado no pipeline.
- **Qualidade:** parser dos históricos merece testes de fixture (OBJ-02) — é o ponto mais frágil (dados externos).
- **Documentação:** manter README com exemplo de execução local e Docker.

## 6. Roadmap

- **Fase 1–3:** concluídas (hardening de 2026-10-11, CI agora).
- **Fase 4:** TEST-01 (OBJ-02).
- **Fase 5:** agendamento e/ou publicação de estatísticas calculadas (OBJ-04).

## 7. Backlog priorizado

1. OBJ-02 — testes de fixture do parser (P3).
2. OBJ-03 — decisão ESM × CJS (P3).
3. OBJ-04 — agendamento documentado (P3).

## 8. Riscos e pendências

- Formato da API da Caixa pode mudar sem aviso → coleta quebra; mitigação: timeout + diagnóstico já presentes.
- Arquivos `.txt` versionados crescem com o tempo; avaliar mover históricos para release assets (não decidido).

## 9. Ideias adicionais

- Relatório estático de frequências (`output/`) gerado automaticamente a cada coleta.

---
*(Gerado em 2026-10-14 pelo agente orquestrador)*
