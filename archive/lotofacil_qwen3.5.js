const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const readline = require('readline');
const path = require('path');

const BASE_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/';

// --- UTILITÁRIOS ---
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

const delay = ms => new Promise(res => setTimeout(res, ms));

// --- CÉREBRO ESTATÍSTICO ---

const CONFIGS = {
  megasena:   { total: 60, qtd: 6,  p: [2, 3, 4],       sMin: 150,  sMax: 220 },
  lotofacil:  { total: 25, qtd: 15, p: [7, 8, 9],       sMin: 175,  sMax: 215 },
  lotomania:  { total: 100,qtd: 50, p: [23, 24, 25, 26, 27], sMin: 2200, sMax: 2800 },
  diadesorte: { total: 31, qtd: 7,  p: [3, 4],          sMin: 80,   sMax: 145 }
};

/**
 * Constrói jogos baseados em peso de frequência e equilíbrio P/I garantido.
 */
function gerarSugestaoAssertiva(savedData, loteria) {
  const conf = CONFIGS[loteria];
  const frequencia = {};
  
  // 1. Mapear frequência de cada número
  savedData.forEach(c => c.dezenas.forEach(n => {
    frequencia[n] = (frequencia[n] || 0) + 1;
  }));

  // 2. Criar Pools (baldes) de números Pares e Ímpares com PESO
  const poolPar = [];
  const poolImpar = [];

  for (let i = 1; i <= conf.total; i++) {
    const freq = frequencia[i] || 0;
    // Peso: números mais frequentes aparecem mais vezes no sorteador manual
    const peso = Math.floor(freq / 2) + 1; 
    
    for (let p = 0; p < peso; p++) {
      if (i % 2 === 0) poolPar.push(i);
      else poolImpar.push(i);
    }
  }

  const sugestoesFinais = [];

  while (sugestoesFinais.length < 3) {
    const jogo = new Set();
    // Define quantos pares este jogo específico terá (escolha aleatória dentro da regra)
    const metaPares = conf.p[Math.floor(Math.random() * conf.p.length)];
    const metaImpares = conf.qtd - metaPares;

    // Tenta montar o jogo respeitando as metas
    let t = 0;
    while (jogo.size < conf.qtd && t < 1000) {
      if (Array.from(jogo).filter(n => n % 2 === 0).length < metaPares) {
        jogo.add(poolPar[Math.floor(Math.random() * poolPar.length)]);
      } else {
        jogo.add(poolImpar[Math.floor(Math.random() * poolImpar.length)]);
      }
      t++;
    }

    const dezenasArray = Array.from(jogo).sort((a, b) => a - b);
    const soma = dezenasArray.reduce((a, b) => a + b, 0);

    // Validação final de soma (Assertividade máxima)
    if (dezenasArray.length === conf.qtd && soma >= conf.sMin && soma <= conf.sMax) {
      sugestoesFinais.push(dezenasArray);
    }
  }

  return sugestoesFinais;
}

// --- INTEGRAÇÃO API ---

async function fetchConcurso(loteria) {
  const filename = `${loteria}.txt`;
  let savedData = loadFile(filename);
  let concurso = (savedData.length ? savedData[savedData.length - 1].numero : 0) + 1;
  let novos = 0;

  console.log(`🔍 Verificando novos concursos para ${loteria.toUpperCase()}...`);

  while (true) {
    try {
      const res = await fetch(`${BASE_API}${loteria}/${concurso}`);
      if (!res.ok) break;

      const data = await res.json();
      if (!data.dezenasSorteadasOrdemSorteio) break;

      const obj = {
        numero: concurso,
        data: data.dataApuracao,
        dezenas: data.dezenasSorteadasOrdemSorteio.map(n => parseInt(n))
      };

      saveLine(filename, obj);
      savedData.push(obj);
      novos++;
      process.stdout.write(`\r📥 Baixado: ${concurso}`);
      concurso++;
      await delay(50); 
    } catch (err) { break; }
  }

  console.log(novos > 0 ? `\n✅ ${novos} novos concursos adicionados.` : `\n✅ Base já está atualizada.`);
  return savedData;
}

// --- EXECUÇÃO ---

async function main() {
  console.log("\n==============================");
  console.log("   ANALISADOR LOTERIAS PRO");
  console.log("==============================\n");
  console.log("1: Mega-Sena | 2: Lotofácil\n3: Lotomania | 4: Dia de Sorte");
  
  const choice = await ask("\nEscolha uma opção: ");
  const mapa = { '1': 'megasena', '2': 'lotofacil', '3': 'lotomania', '4': 'diadesorte' };
  const loteria = mapa[choice];

  if (!loteria) return console.log("Opção inválida.");

  const data = await fetchConcurso(loteria);

  if (data.length < 15) {
    return console.log("⚠️ Dados insuficientes no arquivo para análise estatística.");
  }

  const sugestoes = gerarSugestaoAssertiva(data, loteria);

  console.log(`\n🎯 SUGESTÕES PARA ${loteria.toUpperCase()}:`);
  console.log("--------------------------------------------------");
  sugestoes.forEach((j, i) => {
    const soma = j.reduce((a, b) => a + b, 0);
    const pares = j.filter(n => n % 2 === 0).length;
    console.log(`Jogo ${i+1}: [ ${j.map(n => n.toString().padStart(2, '0')).join(' ')} ]`);
    console.log(`        📊 Soma: ${soma} | Par/Ímpar: ${pares}/${j.length - pares}\n`);
  });

  process.exit(0);
}

main();