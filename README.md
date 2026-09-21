# loteria

## 🐳 Instalação e Execução (Docker) — recomendado

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

### Rodar com Docker
```bash
docker compose up --build
```


### Sem Docker (local)
```bash
npm install
npm start
```


Scripts em **Node.js** para baixar os resultados oficiais das loterias da
Caixa (Lotofácil, Mega-Sena, Lotomania, Dia de Sorte), armazenar o histórico
localmente e fazer análises — incluindo uma versão experimental que usa um
LLM local (**qwen3.5** via Ollama) para gerar jogos.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Status](https://img.shields.io/badge/status-estudo-lightgrey?style=flat-square)

## Sobre

**Projeto de estudo** de 2026 para praticar consumo de APIs públicas, escrita
de arquivos JSON-lines e estatística básica. O script consulta a API oficial
do portal de loterias da Caixa, retoma a partir do último concurso salvo e
mantém um histórico incremental em arquivos `.txt` (uma linha JSON por
concurso).

> Importante: resultados de loteria são aleatórios. As análises e "geradores"
> deste repositório têm valor educacional/estatístico e **não** aumentam
> chances de premiação.

## Funcionalidades

Comprovadas pelo código:

- **Coleta incremental** por loteria: `lotofacil.js` (e variação
  `lotofacil_oldw.js`) consulta `servicebus2.caixa.gov.br`, detecta o último
  concurso salvo e baixa os próximos.
- **Históricos locais**: `lotofacil.txt`, `megasena.txt`, `lotomania.txt`,
  `diadesorte.txt` (JSON por linha).
- **Análises**: `analise_lotofacil.txt`, `erros_lotofacil.txt` e saídas em
  `output/jogos.txt`.
- **Geração experimental com LLM**: `lotofacil_qwen3.5.js` monta jogos
  usando um modelo local servido pelo Ollama.

## Como rodar

```bash
npm install        # dependências (node-fetch etc.)
node lotofacil.js  # escolha a loteria no prompt do script
```

Requisitos: Node.js 18+. Para a versão com LLM, um Ollama local com o modelo
`qwen3.5:0.8b` baixado (`ollama pull qwen3.5:0.8b`).

## Estrutura do projeto

```
lotofacil.js         # coleta/consulta Lotofácil
lotofacil_oldw.js    # versão anterior do script
lotofacil_qwen3.5.js # geração de jogos com LLM local
*.txt                # históricos e análises por loteria
output/              # jogos gerados
```

## Licença

MIT — veja [LICENSE](LICENSE).
