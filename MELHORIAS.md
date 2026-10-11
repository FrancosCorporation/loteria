# MELHORIAS — loteria

> **Gerado por análise de código em 2026-10-05** · Stack: Node 20 + node-fetch (coleta API Caixa)
> Branch: `main` · Repositório: `/home/servidor/Git/loteria`

## Status de execução (2026-10-11)

**Implementados; verificações de runtime não foram executadas:**

- [x] DEVOPS-01 — node_modules removido do índice em be9258b; package-lock mantido.
- [x] BUG-01 — timeout de 15 s na API da Caixa, com diagnóstico de aborto.
- [x] DEVOPS-02 — instalação Docker agora depende somente de npm ci.
- [x] SEC-01 — linhas inválidas são ignoradas com aviso, backup criado antes da primeira escrita e falhas de main tratadas.
- [x] IMP-01 e DOC-01 — variantes preservadas em archive/ e README alinhado ao entrypoint e ao Compose.

**Pendentes:**

- [ ] TEST-01 — não foi adicionada nem executada suíte de testes nesta rodada; o falso script echo foi removido.
- [ ] DEVOPS-03 — CI continua pendente; workflows GitHub não podem ser publicados com a credencial OAuth atual.

O diretório node_modules já estava ausente da árvore de trabalho antes da execução; os históricos .txt não foram alterados. Foram feitos apenas checks estáticos e npm audit.

## 0. Como usar este documento

- Cada item tem 6 campos: **Arquivo:** (caminho:linha reais, lidos no repositório), **Evidência:** (constatação verificada com comando), **Impacto:**, **Mudança:** (o que fazer), **Aceite:** (condição de aceite) e **Verificação:** (bloco bash executável).
- Prioridades: `[P1]` = risco real, corrigir primeiro; `[P2]` = higiene/documentação, planejar.
- Nenhum arquivo:linha foi inventado: todos foram lidos em `/home/servidor/Git/loteria` em 2026-10-05 com leitura de arquivo/`grep -n`/`git ls-files`/`wc -l`, e comportamentos alegados foram **executados** (ex.: `npm test` → exit 0; linha truncada em `lotofacil.txt` → SyntaxError).
- Prefixos: `BUG` (defeito funcional), `TEST` (teste), `DEVOPS` (repo/CI/infra), `IMP` (melhoria estrutural), `DOC` (documentação), `SEC` (integridade/dados).
- Ordem de ataque: §2 (prioridades) → §8 (waves) → itens dentro da wave.

## 1. Diagnóstico executivo

**Bem (verificado):**

- Loop de coleta sólido: `while(true)` em `lotofacil.js:33`, `delay(100)` anti-bloqueio de IP (linha 36), `try/catch` (linhas 35–62), `!res.ok` (linha 39) e 500/404 tratados como "base atualizada" (linhas 40–44) — erro de rede e fim de concurso são encerramentos limpos, não crashes.
- `.gitignore:1` já contém `node_modules/` e `.dockerignore:1` já ignora `node_modules` no build.
- Entrypoint único claro no manifesto: `package.json:5` (`main: lotofacil.js`) e `package.json:7` (`start: node lotofacil.js`).
- Dados `.txt` na raiz (`lotofacil.txt`, `megasena.txt`, `lotomania.txt`, `diadesorte.txt`) são **o propósito** do script — histórico JSON-lines incremental (`saveLine`, `lotofacil.js:19-21`), versionado de propósito. Não é defeito.
- `README.md` existe (78 linhas) com aviso de que loteria é aleatória e valor apenas educacional.

**Quebrado (verificado):**

- `lotofacil.js:37` — `fetch(url)` sem `AbortSignal`/timeout (grep por `AbortSignal|timeout` = vazio): pendurar da Caixa trava o `while(true)` para sempre. `[P1]`
- `package.json:8` — `npm test` é `echo "sem testes automatizados"`; executado: imprime a frase e `exit=0` sem testar nada. `[P1]`
- 127 dos 144 arquivos rastreados são de `node_modules` (`git ls-files | grep -c node_modules` = 127) — já rastreados no índice; `.gitignore` sozinho não os remove. `[P1]`
- `Dockerfile:4` — `RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev` mascara falha do `npm ci` e esconde o stderr. `[P1]`
- Sem CI: `.github` ausente no repositório. `[P2]`
- 3 scripts na raiz; além do main, `lotofacil_oldw.js` (207 linhas) e `lotofacil_qwen3.5.js` (163 linhas) estão commitados mas ninguém os executa (`start` só roda `lotofacil.js`). `[P2]`
- `README.md:10` manda rodar `docker compose up --build`, mas **não existe** `docker-compose.yml`/`compose.yaml` no repo (`find` = vazio) → instrução falha. `[P2]`
- `loadFile` (`lotofacil.js:16`) faz `JSON.parse` por linha sem tolerância; `main()` roda sem `.catch` (linha 164). Testado ao vivo: linha truncada no `.txt` → `SyntaxError: Unexpected end of JSON input` (stack em `lotofacil.js:16`, via `main` linha 144), exit 1. `[P2]`

## 2. Tabela de prioridades

| Item | Pri | Arquivo principal | Esforço |
|---|---|---|---|
| BUG-01 | P1 | lotofacil.js:37 | baixo |
| TEST-01 | P1 | package.json:8 | médio |
| DEVOPS-01 | P1 | índice git + .gitignore:1 | baixo |
| DEVOPS-02 | P1 | Dockerfile:4 | baixo |
| SEC-01 | P2 | lotofacil.js:16,19-21,164 | baixo |
| IMP-01 | P2 | lotofacil_oldw.js, lotofacil_qwen3.5.js | baixo |
| DOC-01 | P2 | README.md:10,46-48,53-54 | baixo |
| DEVOPS-03 | P2 | .github/ (ausente) | médio |

## 3. Segurança

### SEC-01 — Acervo .txt sem tolerância a linha truncada (integridade do histórico) [P2]

**Arquivo:** /home/servidor/Git/loteria/lotofacil.js:16 (`loadFile`), :19-21 (`saveLine`), :144 (chamada), :164 (`main()` sem catch)

**Evidência:** `loadFile` executa `content.trim().split('\n').map(line => JSON.parse(line))` (linha 16) sem try/catch por linha; `saveLine` usa `fs.appendFileSync(...)` (linha 20) sem validação pós-escrita e não há backup dos `.txt`. Verificado ao vivo: com uma linha `{"numero": ` appendada, `printf '2\n' | node lotofacil.js` aborta com `SyntaxError: Unexpected end of JSON input at lotofacil.js:16:64`, `exit=1`; `main()` (linha 164) não tem `.catch`.

**Impacto:** uma única linha parcial (kill no meio da escrita, ENOSPC, corrupção) deixa **toda a próxima execução** morrendo antes de coletar qualquer concurso — o acervo fica indisponível até remoção manual; sem `.bak`, o histórico (única cópia) pode se perder.

**Mudança:** (1) em `loadFile`, envolver o `JSON.parse` de cada linha em try/catch: `console.warn` com número da linha e pular a inválida, em vez de lançar; (2) em `main()`, trocar `main();` por `main().catch(err => { console.error(err); process.exit(1); });`; (3) antes da primeira escrita do processo, copiar `<loteria>.txt` → `<loteria>.txt.bak` (rotacionar).

**Aceite:** com a linha truncada proposital no `.txt`, o script avisa "linha N inválida ignorada" e continua normalmente; `loadFile` não propaga exceção; o `.bak` é criado antes de qualquer `appendFileSync`.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
cp lotofacil.txt /tmp/lotofacil.bak
echo '{"numero": ' >> lotofacil.txt
printf '2\n' | timeout 15 node lotofacil.js; echo "exit=$?"   # após a Mudança: não deve mais morrer com SyntaxError
test -f lotofacil.txt.bak && echo "backup OK"
mv /tmp/lotofacil.bak lotofacil.txt                           # restaurar o acervo
git status --porcelain -- lotofacil.txt                       # deve ficar limpo
```

## 4. Bugs e defeitos funcionais

### BUG-01 — Fetch sem timeout pode travar o loop de coleta para sempre [P1]

**Arquivo:** /home/servidor/Git/loteria/lotofacil.js:3 (fetch via dynamic import do node-fetch), :6 (`BASE_API`), :33 (`while(true)`), :37 (`await fetch(url)`)

**Evidência:** `const res = await fetch(url)` (linha 37) é chamado sem segunda opção `{ signal }`; `grep -n 'AbortSignal\|timeout' lotofacil.js` = vazio. O `try/catch` (linhas 35–62) só captura rejeições — um fetch que nunca resolve (API da Caixa pendurada, TLS/roteador engasgado) **não lança erro** e o `while(true)` (linha 33) nunca sai.

**Impacto:** processo fica zumbi para sempre com o loop rodando, sem novo concurso salvo e sem mensagem de erro; qualquer agendamento/cron em cima disso para de atualizar o histórico silenciosamente.

**Mudança:** passar `AbortSignal.timeout(15000)` (API global do Node 20, sem dependência nova) como `signal` na chamada da linha 37; no `catch` (linha 59), distinguir `err.name === 'AbortError'` com mensagem clara ("timeout na API") antes do `break` — o comportamento de encerrar o loop permanece, mas com diagnóstico.

**Aceite:** fetch pendurado aborta em ~15s, loga o erro de timeout e o loop encerra (`break`) em vez de travar; fetch normal continua funcionando.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
grep -n 'AbortSignal' lotofacil.js                              # deve encontrar o signal novo na chamada de fetch
printf '2\n' | timeout 60 node lotofacil.js; echo "exit=$?"      # deve terminar sozinho, nunca chegar ao timeout do comando
```

## 5. Qualidade: testes

### TEST-01 — `npm test` é um teste falso (echo com exit 0) [P1]

**Arquivo:** /home/servidor/Git/loteria/package.json:8

**Evidência:** script é `"test": "echo \"sem testes automatizados\""`. Executado: `npm test` imprime `sem testes automatizados` e retorna `exit=0`. Zero asserções — um CI futuro (DEVOPS-03) passaria mesmo com o código quebrado.

**Impacto:** qualquer pipeline ou revisão que confie em `npm test` recebe sinal falso de saúde; regressões em `loadFile`/`saveLine`/`filtrarEstatisticas`/`gerarSugestao` passam despercebidas.

**Mudança:** substituir por testes reais com `node:test` (builtin do Node 20, sem dependência nova): `"test": "node --test test/"`. Cobrir pelo menos: `loadFile` com arquivo inexistente/vazio/JSON-lines válido, `getLastConcurso`, `filtrarEstatisticas` (pares/soma por loteria) e `saveLine` appendando uma linha JSON-parseável. Para importar as funções sem disparar o `main()`, extrair as funções puras para um módulo (ex.: `lib/loteria.js`) e fazer `lotofacil.js` exigí-lo — ou guardar a execução de `main()` atrás de `require.main === module`.

**Aceite:** `npm test` executa ≥1 teste real; quebrar propositalmente uma função (ex.: inverter `sMin` de `lotofacil`) faz `npm test` sair com exit ≠ 0.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
npm test; echo "exit=$?"                      # deve listar testes (node:test) e exit 0
sed -i 's/sMin: 175/sMin: 999/' lotofacil.js  # sabotagem temporária (reverter em seguida)
npm test >/dev/null 2>&1; echo "sabotado=$?"  # deve ser != 0
git checkout -- lotofacil.js                  # reverter sabotagem
```

## 6. DevOps / Infra

### DEVOPS-01 — 127 arquivos de node_modules rastreados no índice git [P1]

**Arquivo:** /home/servidor/Git/loteria/.gitignore:1 · índice git (comando `git ls-files`)

**Evidência:** `git ls-files | grep -c node_modules` = **127** de `git ls-files | wc -l` = 144 (ex.: `node_modules/.package-lock.json`, `node_modules/data-uri-to-buffer/dist/index.js`). O `.gitignore:1` **já contém** `node_modules/`, mas gitignore não remove o que já está rastreado — por isso os 127 arquivos permanecem no repositório.

**Impacto:** ~88% dos arquivos do repositório são código de terceiro commitado: ruído em diffs/blame/log, clone desnecessariamente pesado, e updates de dependência viram commits gigantes sem revisão real do que mudou no código próprio.

**Mudança:** `git rm -r --cached node_modules` (apenas do índice, sem apagar do disco) e commitar; manter `.gitignore:1` como está (já correto); `package-lock.json` continua versionado.

**Aceite:** `git ls-files | grep -c node_modules` = 0 após o commit; `node_modules/` permanece no disco; `npm ci` segue funcionando; histórico não é reescrito (sem `filter-repo`, para não quebrar clones existentes).

**Verificação:**
```bash
cd /home/servidor/Git/loteria
git ls-files | grep -c node_modules           # deve ser 0 (grep exit=1)
git ls-files | grep -c '\.txt$'               # acervo .txt continua versionado
npm ci && node -e "require('node-fetch')" && echo "deps OK"
```

### DEVOPS-02 — Dockerfile mascara falha do `npm ci` com `|| npm install` e `2>/dev/null` [P1]

**Arquivo:** /home/servidor/Git/loteria/Dockerfile:4

**Evidência:** linha única: `RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev`. O `2>/dev/null` descarta o stderr real do `npm ci` e o `|| npm install` faz o build **passar mesmo quando o lockfile está inconsistente** (o `npm install` pode instalar versões fora do lock, em silêncio).

**Impacto:** builds não reprodutíveis (imagem pode sair com dependências diferentes do `package-lock.json`), defeitos de instalação só aparecem em runtime; é o mesmo padrão já registrado no acervo (`api_nest_run_container`) — vale cortar aqui também.

**Mudança:** trocar a linha 4 por `RUN npm ci --omit=dev` puro (sem fallback, sem redirecionamento). Se o lock quebrar, o build DEVE quebrar — é o sinal desejado.

**Aceite:** `grep -c '|| npm install\|2>/dev/null' Dockerfile` = 0; build com lockfile válido passa; build com lockfile adulterado falha mostrando o erro real do npm no log.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
grep -n 'npm ci' Dockerfile                      # linha única, sem '|| npm install' nem '2>/dev/null'
docker build -t loteria:test . 2>&1 | tail -5    # concluir, ou falhar com o erro real do npm visível
```

### DEVOPS-03 — Sem pipeline de CI (`.github` ausente) [P2]

**Arquivo:** /home/servidor/Git/loteria/.github/ (diretório inexistente — verificado com `ls .github` → "sem .github"; `git ls-files` não contém `.github/`)

**Evidência:** nenhum workflow commitado. Nada roda `npm ci`/`npm test` em push/PR — inclusive porque hoje não há teste real para rodar (ver TEST-01).

**Impacto:** regressões, lockfile quebrado e Dockerfile falho (DEVOPS-02) só são descobertos manualmente, em uso local ou runtime.

**Mudança:** criar `.github/workflows/ci.yml` disparando em `push`/`pull_request` para `main`: `actions/checkout@v4` + `actions/setup-node@v4` com `node-version: 20` + cache npm + `npm ci` + `npm test` (o teste real pós TEST-01). Opcionalmente job de `docker build` para validar o Dockerfile.

**Aceite:** workflow aparece em Actions e fica verde no próximo push; um PR que quebre um teste fica vermelho.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
test -f .github/workflows/ci.yml && echo "CI existe" || echo "CI AUSENTE"
grep -n 'node-version: 20\|npm ci\|npm test' .github/workflows/ci.yml
```

### IMP-01 — Variantes mortas `lotofacil_oldw.js` e `lotofacil_qwen3.5.js` na raiz [P2]

**Arquivo:** /home/servidor/Git/loteria/lotofacil_oldw.js (207 linhas), /home/servidor/Git/loteria/lotofacil_qwen3.5.js (163 linhas), /home/servidor/Git/loteria/package.json:5,7

**Evidência:** `wc -l` = 207 e 163 respectivamente; `package.json:5` (`"main": "lotofacil.js"`) e `package.json:7` (`"start": "node lotofacil.js"`) apontam só para `lotofacil.js` — nenhuma das duas variantes é referenciada por script algum. O README ainda as descreve como partes funcionais (linhas 46–48 e 53–54).

**Impacto:** ambiguidade sobre qual script é o canônico ("qual eu rodo?"), correções aplicadas em umas variantes e não em outras, e README descrevendo código que o manifesto nunca executa.

**Mudança:** mover as duas variantes para `archive/` (preservar no repo, já que `qwen3.5` é experimento documentado) **ou** removê-las do rastreio (`git rm` — decisão única e explícita); atualizar o README no mesmo commit (ver DOC-01). Não tocar no entrypoint `lotofacil.js`.

**Aceite:** `git ls-files | grep -E 'oldw|qwen'` retorna vazio ou só caminhos sob `archive/`; `npm start` inalterado; README não referencia caminhos inexistentes.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
git ls-files | grep -E 'oldw|qwen'           # vazio, ou apenas archive/*
printf '\n' | timeout 10 node lotofacil.js | head -2   # prompt do entrypoint continua subindo
grep -rn 'oldw\|qwen' README.md | head -5    # caminhos citados no README batem com o repo
```

## 7. Documentação

### DOC-01 — README sem aviso claro de entrypoint/variantes e com instrução Docker inválida [P2]

**Arquivo:** /home/servidor/Git/loteria/README.md:10,46-48,53-54,60,70

**Evidência:** (a) linha 10 instrui `docker compose up --build`, mas não existe `docker-compose.yml`/`compose.yaml` no repo (`find . -maxdepth 2 -name 'docker-compose*' -o -name 'compose.y*'` = vazio) → o comando falha; (b) linhas 46–48 apresentam `lotofacil_oldw.js` como "variação" que "consulta servicebus2.caixa.gov.br" sem dizer que é legada/não suportada, e linhas 53–54 descrevem `lotofacil_qwen3.5.js` sem vincular ao entrypoint; só a linha 60 mostra `node lotofacil.js`. Quem define o suportado é o manifesto (`package.json:5,7`).

**Impacto:** novo colaborador segue o README e roda `docker compose up` (erro imediato) ou executa variante morta achando que é a oficial; suporte e atualizações se dispersam entre 3 scripts.

**Mudança:** (1) trocar a linha 10 por comandos que funcionam — `docker build -t loteria .` + `docker run -it -v "$PWD:/app" loteria` (não há compose) — ou adicionar um `docker-compose.yml` real, escolha única; (2) acrescentar aviso explícito: "`lotofacil.js` é o único entrypoint suportado (`npm start`); `lotofacil_oldw.js` e `lotofacil_qwen3.5.js` são legadas/experimentais, sem suporte (ver IMP-01)"; (3) alinhar as linhas 46–54 e 70 com essa decisão.

**Aceite:** cada comando do README roda copiado e colado sem erro a partir de um clone limpo; o README declara em um único lugar qual script é o oficial.

**Verificação:**
```bash
cd /home/servidor/Git/loteria
grep -n 'docker compose' README.md                       # vazio, ou existir docker-compose.yml correspondente
test -f docker-compose.yml || grep -n 'docker build' README.md   # instrução Docker que funciona documentada
grep -n 'entrypoint\|suportado\|legada' README.md | head -5      # aviso de variantes presente
```

## 8. Ordem de execução (waves)

**Wave 1 — P1 (risco real):**

1. `DEVOPS-01` — tirar `node_modules` do índice + commit (base limpa para todo o resto).
2. `BUG-01` — `AbortSignal.timeout` no fetch (deixa de travar).
3. `DEVOPS-02` — Dockerfile sem fallback mascarado.
4. `TEST-01` — testes reais com `node:test` (sem ele, a Wave 2 não tem rede de segurança).

**Wave 2 — P2 (integridade e clareza):**

5. `SEC-01` — tolerância a linha truncada + `.bak` (cobre `loadFile` com os testes do TEST-01).
6. `IMP-01` + `DOC-01` — decidir destino das variantes e corrigir README **no mesmo commit** (o README referencia esses arquivos).
7. `DEVOPS-03` — CI usando o `npm test` real.

**Regra:** um item só entra na próxima wave quando a sua **Verificação** está verde; não misturar mudança de comportamento (SEC-01) com mudança de docs no mesmo commit.

## 9. Fora de escopo / riscos

**Fora de escopo (não fazer):**

- **Não trocar a API oficial da Caixa por scrape**: `BASE_API` (`lotofacil.js:6`) é endpoint oficial e já tratado com contrato 500/404/`!res.ok` — scraping seria mais frágil e indevido. Manter `servicebus2.caixa.gov.br`.
- **Não excluir os dados `.txt`** (`lotofacil.txt`, `megasena.txt`, `lotomania.txt`, `diadesorte.txt`, `output/jogos.txt`, `analise_lotofacil.txt`, `erros_lotofacil.txt`): são o acervo histórico e o propósito do repositório; o versionamento de histórico é decisão consciente.
- Não reescrever o coletor em outro runtime/framework: Node 20 + `commonjs` + `node-fetch` são o stack vigente.
- Não fazer reescrita de histórico (`git filter-repo`) no DEVOPS-01 — quebraria clones existentes; `git rm --cached` + commit basta.

**Riscos:**

- A API da Caixa não tem SLA documentado: mesmo com timeout (BUG-01) o servidor pode recusar; o tratamento 500/404/`!res.ok` existente já é o fallback correto e deve ser mantido.
- O README menciona Ollama/`qwen3.5:0.8b` para a variante experimental — ao mover as variantes (IMP-01), essa seção precisa acompanhar, senão vira referência morta.
- Extrair funções para testar (TEST-01) mexe no entrypoint: manter `npm start` apontando para `lotofacil.js` e rodar `npm test` antes/depois.

## 10. Definição de pronto (DoD)

Um item está pronto quando **todos** os itens abaixo valem:

- [ ] Os 6 campos do item refletem o código real pós-mudança (nenhum arquivo:linha obsoleto).
- [ ] O bloco **Verificação:** roda de ponta a ponta e retorna exit 0 / valor esperado.
- [ ] `python3 /tmp/validate.py loteria` continua imprimindo `OK`.
- [ ] `npm test` verde (pós TEST-01) e `git ls-files | grep -c node_modules` = 0 (pós DEVOPS-01).
- [ ] `grep -n 'AbortSignal' lotofacil.js` encontra o timeout (pós BUG-01).
- [ ] Nenhum `.txt` do acervo alterado ou excluído (`git status` limpo nos históricos).
- [ ] README não referencia arquivo ou comando inexistente (pós DOC-01/IMP-01).
- [ ] Mensagem de commit no padrão do repo (`fix:`/`chore:`/`docs:`/`test:`), um tema por commit.

*Fim do plano. Gerado por leitura direta do código em 2026-10-05 — todos os arquivo:linha foram verificados em /home/servidor/Git/loteria (grep/wc/git ls-files e execução real do script); nada foi inventado. Validado com python3 /tmp/validate.py loteria.*




