// loterias_auto.js
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');

// Base única para todas as loterias
const BASE_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/';

// Função para ler input do usuário
async function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Carregar arquivo existente ou criar vazio
function loadFile(filename) {
  if (!fs.existsSync(filename)) return [];
  const content = fs.readFileSync(filename, 'utf-8');
  if (!content) return [];
  return content.trim().split('\n').map(line => JSON.parse(line));
}

// Salvar linha no arquivo
function saveLine(filename, data) {
  fs.appendFileSync(filename, JSON.stringify(data) + '\n');
}

// Pegar último concurso salvo
function getLastConcurso(savedData) {
  if (!savedData.length) return 0;
  return savedData[savedData.length - 1].numero;
}

// Baixar concursos
async function fetchConcurso(apiBase, startConcurso, savedData, loteriaName) {
  let concurso = startConcurso;
  let novos = 0;

  while (true) {
    const url = `${apiBase}${concurso}`;
    try {
      const res = await fetch(url);

      if (!res.ok) {
        console.warn(`Parando download: concurso ${concurso} não existe ou erro HTTP ${res.status}`);

        // Se for erro 500, significa que não há concurso novo — encerra e retorna
        if (res.status === 500) {
          console.log("Nenhum novo concurso disponível. Gerando estatísticas com base nos dados existentes...");
          return { data: savedData, novos };
        }

        break;
      }

      const data = await res.json();

      // Verifica se a API retornou dezenas válidas
      if (
        !data.dezenasSorteadasOrdemSorteio ||
        !Array.isArray(data.dezenasSorteadasOrdemSorteio) ||
        data.dezenasSorteadasOrdemSorteio.length === 0
      ) {
        console.warn(`Parando download: concurso ${concurso} sem dezenas válidas`);
        break;
      }

      // Salva apenas se ainda não estiver no arquivo
      if (!savedData.find(c => c.numero === concurso)) {
        const numeros = data.dezenasSorteadasOrdemSorteio.map(n => parseInt(n));
        const obj = {
          numero: concurso,
          data: data.dataApuracao,
          dezenas: numeros
        };
        saveLine(`${loteriaName}.txt`, obj);
        savedData.push(obj);
        novos++;
        console.log(`Salvo concurso ${concurso}`);
      }

      concurso++;

    } catch (err) {
      console.error(`Erro ao buscar concurso ${concurso}: ${err}`);
      break;
    }
  }

  return { data: savedData, novos };
}

// Gerar 3 jogos prováveis
function gerarJogosProbabilisticos(savedData, loteria) {
  if (!savedData.length) return [];

  let numerosTotais, dezenasSorteadas;
  switch (loteria) {
    case 'megasena':
      numerosTotais = 60;
      dezenasSorteadas = 6;
      break;
    case 'lotofacil':
      numerosTotais = 25;
      dezenasSorteadas = 15;
      break;
    case 'lotomania':
      numerosTotais = 100;
      dezenasSorteadas = 50;
      break;
    case 'diadesorte':
      numerosTotais = 31; // Dezenas de 1 a 31
      dezenasSorteadas = 7;
      break;
    default:
      throw new Error("Loteria desconhecida");
  }

  const freq = Array(numerosTotais + 1).fill(0);
  savedData.forEach(c => c.dezenas.forEach(n => freq[n]++));

  const ultimo = savedData[savedData.length - 1].dezenas;

  // Cria um conjunto de números disponíveis (excluindo o último, se possível)
  let disponiveis = Array.from({ length: numerosTotais }, (_, i) => i + 1)
    .filter(n => !ultimo.includes(n));

  if (disponiveis.length < dezenasSorteadas) {
    disponiveis = Array.from({ length: numerosTotais }, (_, i) => i + 1);
  }

  const jogos = [];

  for (let j = 0; j < 3; j++) {
    const jogo = new Set();
    while (jogo.size < dezenasSorteadas) {
      const r = disponiveis[Math.floor(Math.random() * disponiveis.length)];
      jogo.add(r);
    }

    const dezenasArray = Array.from(jogo).sort((a, b) => a - b);

    // Para Dia de Sorte, adiciona também um mês aleatório
    if (loteria === 'diadesorte') {
      const mesDaSorte = Math.floor(Math.random() * 12) + 1; // 1 a 12
      jogos.push({ dezenas: dezenasArray, mes: mesDaSorte });
    } else {
      jogos.push(dezenasArray);
    }
  }

  return jogos;
}

// Função principal
async function main() {
  console.log("Escolha a loteria:");
  console.log("1 - Mega-Sena (R$7,00)");
  console.log("2 - Lotofácil (R$3,50)");
  console.log("3 - Lotomania (R$3,00)");
  console.log("4 - Dia de Sorte (R$2,50)");
  const choice = await ask("Digite 1, 2, 3 ou 4: ");

  const loterias = {
    '1': 'megasena',
    '2': 'lotofacil',
    '3': 'lotomania',
    '4': 'diadesorte'
  };

  const loteria = loterias[choice];
  if (!loteria) {
    console.log("Escolha inválida");
    return;
  }

  const apiBase = `${BASE_API}${loteria}/`;
  const filename = `${loteria}.txt`;

  const savedData = loadFile(filename);
  const startConcurso = getLastConcurso(savedData) + 1;
  console.log(`Último concurso salvo: ${startConcurso - 1}`);

  const { data: updatedData, novos } = await fetchConcurso(apiBase, startConcurso, savedData, loteria);

  console.log(`\n✅ Atualização concluída. Concursos novos: ${novos}`);
  const jogos = gerarJogosProbabilisticos(updatedData, loteria);

  console.log(`\n🎯 3 Jogos (${loteria}) prováveis com base no histórico:`);
  jogos.forEach((j, i) => {
    if (loteria === 'diadesorte') {
      console.log(`Jogo ${i + 1}: ${j.dezenas.join(', ')} | Mês da Sorte: ${j.mes}`);
    } else {
      console.log(`Jogo ${i + 1}: ${j.join(', ')}`);
    }
  });

  process.exit(0);
}

main();
