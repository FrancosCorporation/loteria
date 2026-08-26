// loterias_pro.js
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');

const BASE_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/';

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

function loadFile(filename) {
  if (!fs.existsSync(filename)) return [];
  const content = fs.readFileSync(filename, 'utf-8');
  return content ? content.trim().split('\n').map(line => JSON.parse(line)) : [];
}

function saveLine(filename, data) {
  fs.appendFileSync(filename, JSON.stringify(data) + '\n');
}

function getLastConcurso(savedData) {
  return savedData.length ? savedData[savedData.length - 1].numero : 0;
}

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchConcurso(apiBase, startConcurso, savedData, loteriaName) {
  let concurso = startConcurso;
  let novos = 0;

  while (true) {
    const url = `${apiBase}${concurso}`;
    try {
      await delay(100); // Evita bloqueio de IP
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 500 || res.status === 404) {
          console.log("✅ Base de dados atualizada.");
          return { data: savedData, novos };
        }
        break;
      }

      const data = await res.json();
      if (!data.dezenasSorteadasOrdemSorteio) break;

      const numeros = data.dezenasSorteadasOrdemSorteio.map(n => parseInt(n));
      const obj = { numero: concurso, data: data.dataApuracao, dezenas: numeros };
      
      saveLine(`${loteriaName}.txt`, obj);
      savedData.push(obj);
      novos++;
      console.log(`📥 Baixado: Concurso ${concurso}`);
      concurso++;

    } catch (err) {
      console.error(`Erro no concurso ${concurso}: ${err.message}`);
      break;
    }
  }
  return { data: savedData, novos };
}

// --- LÓGICA DE ASSERTIVIDADE ---

function filtrarEstatisticas(dezenas, loteria) {
  const pares = dezenas.filter(n => n % 2 === 0).length;
  const impares = dezenas.length - pares;
  const soma = dezenas.reduce((a, b) => a + b, 0);

  // Filtros baseados em tendências históricas reais
  const regras = {
    megasena: { p: [2, 3, 4], sMin: 150, sMax: 220 },
    lotofacil: { p: [6, 7, 8, 9], sMin: 175, sMax: 215 },
    lotomania: { p: [23, 24, 25, 26, 27], sMin: 2200, sMax: 2800 },
    diadesorte: { p: [3, 4], sMin: 80, sMax: 145 }
  };

  const r = regras[loteria];
  if (!r) return true;

  const parValido = r.p.includes(pares);
  const somaValida = soma >= r.sMin && soma <= r.sMax;

  return parValido && somaValida;
}

function gerarSugestao(savedData, loteria) {
  const configs = {
    megasena: { total: 60, qtd: 6 },
    lotofacil: { total: 25, qtd: 15 },
    lotomania: { total: 100, qtd: 50 },
    diadesorte: { total: 31, qtd: 7 }
  };

  const conf = configs[loteria];
  const frequencia = Array(conf.total + 1).fill(0);
  
  // Analisa histórico para dar peso aos números frequentes
  savedData.forEach(c => c.dezenas.forEach(n => frequencia[n]++));

  const pool = [];
  for (let i = 1; i <= conf.total; i++) {
    // Adiciona o número no "pote" de sorteio proporcional à sua frequência
    const peso = Math.max(1, Math.floor(frequencia[i] / 5)); 
    for (let p = 0; p < peso; p++) pool.push(i);
  }

  const jogosValidos = [];
  let tentativas = 0;

  while (jogosValidos.length < 3 && tentativas < 5000) {
    const jogo = new Set();
    while (jogo.size < conf.qtd) {
      const num = pool[Math.floor(Math.random() * pool.length)];
      jogo.add(num);
    }
    
    const dezenasArray = Array.from(jogo).sort((a, b) => a - b);
    
    if (filtrarEstatisticas(dezenasArray, loteria)) {
      jogosValidos.push(dezenasArray);
    }
    tentativas++;
  }

  return jogosValidos;
}

async function main() {
  console.log("\n--- ANALISADOR DE LOTERIAS PRO ---");
  console.log("1: Mega-Sena | 2: Lotofácil | 3: Lotomania | 4: Dia de Sorte");
  const choice = await ask("Escolha: ");

  const mapa = { '1': 'megasena', '2': 'lotofacil', '3': 'lotomania', '4': 'diadesorte' };
  const loteria = mapa[choice];

  if (!loteria) return console.log("Opção inválida.");

  const filename = `${loteria}.txt`;
  let data = loadFile(filename);
  
  const { data: updatedData, novos } = await fetchConcurso(`${BASE_API}${loteria}/`, getLastConcurso(data) + 1, data, loteria);

  if (updatedData.length < 10) {
    return console.log("⚠️ Dados insuficientes para análise. Baixe mais concursos.");
  }

  const sugestoes = gerarSugestao(updatedData, loteria);

  console.log(`\n🎯 SUGESTÕES PARA ${loteria.toUpperCase()} (Baseadas em Equilíbrio e Frequência):`);
  sugestoes.forEach((j, i) => {
    const soma = j.reduce((a, b) => a + b, 0);
    const pares = j.filter(n => n % 2 === 0).length;
    console.log(`Jogo ${i+1}: [ ${j.join(', ')} ] | Soma: ${soma} | P/I: ${pares}/${j.length - pares}`);
  });

  process.exit(0);
}

main();