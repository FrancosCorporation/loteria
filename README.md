# Loteria

Scripts Node.js para coletar resultados oficiais da Caixa, manter históricos locais e explorar estatísticas básicas. O projeto é educacional: sorteios são aleatórios e as análises não aumentam a chance de premiação.

## Requisitos

- Node.js 22 ou superior.
- Para usar Docker: Docker Engine e Docker Compose v2.

## Execução local

~~~bash
npm ci
npm start
~~~

O programa pergunta qual loteria consultar. O histórico é salvo nos arquivos lotofacil.txt, megasena.txt, lotomania.txt e diadesorte.txt na pasta do projeto.

Para reiniciar automaticamente quando o código mudar:

~~~bash
npm run dev
~~~

## Execução com Docker Compose

~~~bash
docker compose up --build
~~~

O Compose mantém os arquivos de histórico na pasta do projeto e guarda as dependências em um volume separado. Use Ctrl+C para parar.

## O que o projeto executa

lotofacil.js é o único entrypoint suportado e é iniciado por npm start. Ele consulta a API oficial da Caixa, atualiza o histórico selecionado e exibe sugestões com base em frequências e filtros simples. Essas sugestões são apenas experimentais e não preveem resultados.

As variantes antigas foram preservadas em archive/ para consulta, mas não são executadas nem mantidas como ferramentas suportadas:

- archive/lotofacil_oldw.js: versão anterior do coletor.
- archive/lotofacil_qwen3.5.js: experimento com Ollama; requer o modelo local qwen3.5:0.8b e não faz parte do fluxo padrão.

O diretório output/ guarda jogos gerados manualmente. Os históricos e arquivos de análise existentes são dados do projeto e permanecem versionados.

Ainda não há suíte de testes automatizados.

## Licença

MIT — consulte LICENSE.
