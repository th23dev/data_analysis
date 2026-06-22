const fs = require("fs");
const path = require("path");
const readline = require("readline");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "outputs");
const tableDir = path.join(outDir, "tables");
const figDir = path.join(outDir, "figures");
fs.mkdirSync(tableDir, { recursive: true });
fs.mkdirSync(figDir, { recursive: true });

const files = fs.readdirSync(dataDir).filter((f) => /^DENGBR\d+\.csv$/i.test(f)).sort();
if (!files.length) throw new Error(`Nenhum arquivo DENGBR*.csv encontrado em ${dataDir}`);

const annual = new Map();
const sex = new Map();
const race = new Map();
const ageGroup = new Map();
const classFinal = new Map();
const criterion = new Map();
const evolution = new Map();
const hospital = new Map();
const symptoms = new Map();
const ageStats = new Map();
const symptomColumns = ["FEBRE", "MIALGIA", "CEFALEIA", "EXANTEMA", "VOMITO", "NAUSEA", "DOR_COSTAS", "DOR_RETRO", "ARTRALGIA", "PETEQUIA_N", "LEUCOPENIA", "LACO"];

let totalRows = 0;
let firstDate = null;
let lastDate = null;

const add = (map, key, n = 1) => map.set(key || "Ignorado/Branco", (map.get(key || "Ignorado/Branco") || 0) + n);
const get = (map, key) => map.get(key) || 0;
const pct = (part, total, decimals = 2) => total ? ((part / total) * 100).toFixed(decimals) : "0";
const value = (parts, idx, name) => {
  const i = idx.get(name);
  return i !== undefined && i < parts.length ? parts[i].trim() : "";
};

function mapSex(code) {
  return { F: "Feminino", M: "Masculino", I: "Ignorado" }[code] || "Ignorado/Branco";
}

function mapRace(code) {
  return { 1: "Branca", 2: "Preta", 3: "Amarela", 4: "Parda", 5: "Indigena", 9: "Ignorado" }[code] || "Ignorado/Branco";
}

function mapYesNo(code) {
  return { 1: "Sim", 2: "Nao", 9: "Ignorado" }[code] || "Ignorado/Branco";
}

function mapClass(code) {
  return { 5: "Descartado", 8: "Inconclusivo", 10: "Dengue", 11: "Dengue com sinais de alarme", 12: "Dengue grave", 13: "Chikungunya" }[code] || (code ? `Codigo ${code}` : "Ignorado/Branco");
}

function mapCriterion(code) {
  return { 1: "Laboratorial", 2: "Clinico-epidemiologico", 3: "Em investigacao" }[code] || (code ? `Codigo ${code}` : "Ignorado/Branco");
}

function mapEvolution(code) {
  return { 1: "Cura", 2: "Obito pelo agravo", 3: "Obito por outras causas", 4: "Obito em investigacao", 9: "Ignorado" }[code] || (code ? `Codigo ${code}` : "Ignorado/Branco");
}

function decodeAge(raw) {
  if (!raw || raw.length < 2) return null;
  const unit = raw[0];
  const n = Number.parseInt(raw.slice(1), 10);
  if (!Number.isFinite(n)) return null;
  if (unit === "1" || unit === "2") return 0;
  if (unit === "3") return n / 12;
  if (unit === "4") return n;
  return null;
}

function groupAge(age) {
  if (age === null) return "Ignorado/Branco";
  if (age < 1) return "<1";
  if (age < 10) return "1-9";
  if (age < 20) return "10-19";
  if (age < 40) return "20-39";
  if (age < 60) return "40-59";
  return "60+";
}

function addAge(year, age) {
  if (age === null) return;
  if (!ageStats.has(year)) ageStats.set(year, { n: 0, sum: 0, sumSq: 0, hist: new Map() });
  const s = ageStats.get(year);
  s.n += 1;
  s.sum += age;
  s.sumSq += age * age;
  const ageInt = Math.max(0, Math.min(130, Math.floor(age)));
  s.hist.set(ageInt, (s.hist.get(ageInt) || 0) + 1);
}

function medianFromHist(hist, n) {
  if (!n) return "";
  const p1 = Math.floor((n - 1) / 2);
  const p2 = Math.floor(n / 2);
  let acc = 0;
  let v1 = null;
  let v2 = null;
  for (const age of [...hist.keys()].sort((a, b) => a - b)) {
    acc += hist.get(age);
    if (v1 === null && acc > p1) v1 = age;
    if (v2 === null && acc > p2) {
      v2 = age;
      break;
    }
  }
  return ((v1 + v2) / 2).toFixed(2);
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeRows(file, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const content = [cols.map(csvEscape).join(","), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(","))].join("\n");
  fs.writeFileSync(file, `\uFEFF${content}\n`, "utf8");
}

function counterRows(map, cols) {
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, n]) => {
    const parts = key.split("|");
    const row = {};
    cols.forEach((col, i) => row[col] = parts[i] || "");
    row.n = n;
    return row;
  });
}

function writeCounter(file, map, cols) {
  writeRows(file, counterRows(map, cols));
}

function xml(s) {
  return String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

function writeBarSvg(rows, labelCol, valueCol, title, file) {
  if (!rows.length) return;
  const width = 920, left = 190, right = 40, top = 58, barHeight = 28, gap = 10;
  const height = top + rows.length * (barHeight + gap) + 30;
  const plotWidth = width - left - right;
  const max = Math.max(...rows.map((r) => Number(r[valueCol]) || 0), 1);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
  svg += `<rect width="100%" height="100%" fill="#ffffff"/>\n`;
  svg += `<text x="24" y="34" font-family="Arial" font-size="22" font-weight="700" fill="#1f2937">${xml(title)}</text>\n`;
  rows.forEach((r, i) => {
    const y = top + i * (barHeight + gap);
    const val = Number(r[valueCol]) || 0;
    const barWidth = Math.round((val / max) * plotWidth * 10) / 10;
    svg += `<text x="24" y="${y + 20}" font-family="Arial" font-size="14" fill="#374151">${xml(r[labelCol])}</text>\n`;
    svg += `<rect x="${left}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="#2563eb"/>\n`;
    svg += `<text x="${left + barWidth + 8}" y="${y + 20}" font-family="Arial" font-size="13" fill="#111827">${val.toLocaleString("pt-BR")}</text>\n`;
  });
  svg += "</svg>\n";
  fs.writeFileSync(file, svg, "utf8");
}

async function processFile(fileName) {
  console.log(`Processando ${fileName}...`);
  const filePath = path.join(dataDir, fileName);
  const rl = readline.createInterface({ input: fs.createReadStream(filePath, { encoding: "utf8", highWaterMark: 1024 * 1024 }), crlfDelay: Infinity });
  let idx = null;
  for await (const line of rl) {
    if (!idx) {
      idx = new Map(line.split(",").map((name, i) => [name, i]));
      continue;
    }
    if (!line) continue;
    const parts = line.split(",");
    let year = value(parts, idx, "NU_ANO");
    if (!year) year = `20${fileName.match(/\d+/)?.[0] || ""}`;
    totalRows += 1;
    add(annual, year);
    add(sex, `${year}|${mapSex(value(parts, idx, "CS_SEXO"))}`);
    add(race, `${year}|${mapRace(value(parts, idx, "CS_RACA"))}`);
    add(classFinal, `${year}|${mapClass(value(parts, idx, "CLASSI_FIN"))}`);
    add(criterion, `${year}|${mapCriterion(value(parts, idx, "CRITERIO"))}`);
    add(evolution, `${year}|${mapEvolution(value(parts, idx, "EVOLUCAO"))}`);
    add(hospital, `${year}|${mapYesNo(value(parts, idx, "HOSPITALIZ"))}`);
    const age = decodeAge(value(parts, idx, "NU_IDADE_N"));
    add(ageGroup, `${year}|${groupAge(age)}`);
    addAge(year, age);
    for (const symptom of symptomColumns) add(symptoms, `${year}|${symptom}|${mapYesNo(value(parts, idx, symptom))}`);
    const dt = value(parts, idx, "DT_NOTIFIC");
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
      if (!firstDate || dt < firstDate) firstDate = dt;
      if (!lastDate || dt > lastDate) lastDate = dt;
    }
  }
}

(async () => {
  for (const file of files) await processFile(file);

  const years = [...annual.keys()].sort();
  const annualRows = years.map((year) => {
    const cases = get(annual, year);
    const ages = ageStats.get(year) || { n: 0, sum: 0, sumSq: 0, hist: new Map() };
    const hospYes = get(hospital, `${year}|Sim`);
    const deaths = get(evolution, `${year}|Obito pelo agravo`);
    const confirmed = get(classFinal, `${year}|Dengue`) + get(classFinal, `${year}|Dengue com sinais de alarme`) + get(classFinal, `${year}|Dengue grave`);
    const mean = ages.n ? ages.sum / ages.n : 0;
    const sd = ages.n > 1 ? Math.sqrt((ages.sumSq - (ages.sum * ages.sum / ages.n)) / (ages.n - 1)) : 0;
    return {
      ano: year,
      casos_notificados: cases,
      percentual_total: pct(cases, totalRows),
      idade_media: ages.n ? mean.toFixed(2) : "",
      idade_mediana: ages.n ? medianFromHist(ages.hist, ages.n) : "",
      idade_desvio_padrao: ages.n > 1 ? sd.toFixed(2) : "",
      hospitalizacoes: hospYes,
      hospitalizacao_percentual: pct(hospYes, cases),
      obitos_pelo_agravo: deaths,
      letalidade_notificados_percentual: pct(deaths, cases, 4),
      casos_confirmados_dengue: confirmed,
      confirmados_percentual: pct(confirmed, cases),
    };
  });

  writeRows(path.join(tableDir, "resumo_anual.csv"), annualRows);
  writeCounter(path.join(tableDir, "sexo_por_ano.csv"), sex, ["ano", "sexo"]);
  writeCounter(path.join(tableDir, "raca_cor_por_ano.csv"), race, ["ano", "raca_cor"]);
  writeCounter(path.join(tableDir, "faixa_etaria_por_ano.csv"), ageGroup, ["ano", "faixa_etaria"]);
  writeCounter(path.join(tableDir, "classificacao_final_por_ano.csv"), classFinal, ["ano", "classificacao_final"]);
  writeCounter(path.join(tableDir, "criterio_por_ano.csv"), criterion, ["ano", "criterio_confirmacao"]);
  writeCounter(path.join(tableDir, "evolucao_por_ano.csv"), evolution, ["ano", "evolucao"]);
  writeCounter(path.join(tableDir, "hospitalizacao_por_ano.csv"), hospital, ["ano", "hospitalizado"]);
  writeCounter(path.join(tableDir, "sintomas_por_ano.csv"), symptoms, ["ano", "sintoma", "resposta"]);
  writeRows(path.join(tableDir, "metadados_processamento.csv"), [{
    arquivos_processados: files.join("; "),
    total_registros: totalRows,
    primeira_notificacao: firstDate || "",
    ultima_notificacao: lastDate || "",
    gerado_em: new Date().toISOString().slice(0, 19).replace("T", " "),
  }]);

  writeBarSvg(annualRows, "ano", "casos_notificados", "Casos notificados por ano", path.join(figDir, "casos_por_ano.svg"));
  const latestYear = years.at(-1);
  const ageOrder = { "<1": 0, "1-9": 1, "10-19": 2, "20-39": 3, "40-59": 4, "60+": 5 };
  const ageLatest = counterRows(ageGroup, ["ano", "faixa_etaria"]).filter((r) => r.ano === latestYear && r.faixa_etaria !== "Ignorado/Branco").sort((a, b) => ageOrder[a.faixa_etaria] - ageOrder[b.faixa_etaria]);
  writeBarSvg(ageLatest, "faixa_etaria", "n", `Casos por faixa etaria em ${latestYear}`, path.join(figDir, `faixa_etaria_${latestYear}.svg`));
  const topSymptoms = counterRows(symptoms, ["ano", "sintoma", "resposta"]).filter((r) => r.ano === latestYear && r.resposta === "Sim").sort((a, b) => b.n - a.n).slice(0, 10);
  writeBarSvg(topSymptoms, "sintoma", "n", `Sintomas mais registrados em ${latestYear}`, path.join(figDir, `sintomas_${latestYear}.svg`));

  const peak = [...annualRows].sort((a, b) => b.casos_notificados - a.casos_notificados)[0];
  const latest = annualRows.find((r) => r.ano === latestYear);
  const latestTotal = latest.casos_notificados;
  const female = get(sex, `${latestYear}|Feminino`);
  const male = get(sex, `${latestYear}|Masculino`);
  const topAge = [...counterRows(ageGroup, ["ano", "faixa_etaria"]).filter((r) => r.ano === latestYear)].sort((a, b) => b.n - a.n)[0];
  const symptomSentence = topSymptoms.slice(0, 5).map((r) => `${r.sintoma} (${Number(r.n).toLocaleString("pt-BR")}; ${pct(r.n, latestTotal)}%)`).join("; ");
  const md = `# Analise estatistica dos dados de dengue

## Metodo

Foi realizado um estudo descritivo com dados secundarios de notificacoes de dengue registradas nos arquivos DENGBR20.csv a DENGBR26.csv. A origem dos dados foi associada ao Painel de Monitoramento das Arboviroses do Ministerio da Saude, disponivel no gov.br, dentro do Observatorio de Arboviroses. Segundo o Ministerio da Saude, o observatorio disponibiliza paineis de monitoramento com atualizacao diaria e relatorios semanais sobre a situacao epidemiologica nacional, estadual e municipal.

Foram analisadas ${totalRows.toLocaleString("pt-BR")} notificacoes no periodo de ${firstDate} a ${lastDate}. As variaveis selecionadas foram ano de notificacao, sexo, raca/cor, idade, faixa etaria, classificacao final, criterio de confirmacao, hospitalizacao, evolucao e sintomas clinicos. A idade foi decodificada a partir do campo NU_IDADE_N e agrupada em <1, 1-9, 10-19, 20-39, 40-59 e 60+ anos.

Foram calculadas frequencias absolutas e relativas para variaveis categoricas. Para idade, calcularam-se media, mediana aproximada em anos completos e desvio-padrao. A letalidade foi estimada pela proporcao de obitos pelo agravo entre o total de notificacoes do respectivo ano. As tabelas completas estao em outputs/tables e as figuras em outputs/figures.

## Resultados

No periodo analisado, foram identificadas ${totalRows.toLocaleString("pt-BR")} notificacoes. O ano com maior volume foi ${peak.ano}, com ${peak.casos_notificados.toLocaleString("pt-BR")} registros (${peak.percentual_total}% do total). Em ${latestYear}, foram observadas ${latestTotal.toLocaleString("pt-BR")} notificacoes, com idade media de ${latest.idade_media} anos, mediana de ${latest.idade_mediana} anos e desvio-padrao de ${latest.idade_desvio_padrao} anos.

O ano de 2024 concentrou quase metade de todas as notificacoes da serie analisada, indicando um pico epidemiologico muito superior aos demais anos do recorte. Ja 2026 deve ser interpretado como ano incompleto, pois os dados disponiveis chegam ate ${lastDate}. Assim, a comparacao direta de 2026 com anos fechados pode subestimar o volume anual real.

Quanto ao sexo em ${latestYear}, foram registrados ${female.toLocaleString("pt-BR")} casos no sexo feminino (${pct(female, latestTotal)}%) e ${male.toLocaleString("pt-BR")} no sexo masculino (${pct(male, latestTotal)}%). A faixa etaria mais frequente nesse ano foi ${topAge.faixa_etaria}, com ${Number(topAge.n).toLocaleString("pt-BR")} notificacoes (${pct(topAge.n, latestTotal)}%).

A hospitalizacao em ${latestYear} foi registrada em ${Number(latest.hospitalizacoes).toLocaleString("pt-BR")} notificacoes (${latest.hospitalizacao_percentual}%). Foram registrados ${Number(latest.obitos_pelo_agravo).toLocaleString("pt-BR")} obitos pelo agravo, correspondendo a letalidade de ${latest.letalidade_notificados_percentual}% entre as notificacoes. Os sintomas com maior frequencia de resposta positiva em ${latestYear} foram: ${symptomSentence}.

## Interpretacao

Os dados mostram comportamento fortemente concentrado no ano de 2024, que foi o principal responsavel pelo volume total de notificacoes entre 2020 e 2026. Essa concentracao sugere que a serie nao apresenta crescimento linear simples, mas sim um padrao de surto/epidemia com grande oscilacao anual.

Em relacao ao perfil dos casos, a maior frequencia em adultos de 20 a 39 anos indica maior registro em populacao economicamente ativa. Entretanto, como a base representa notificacoes, esse resultado pode refletir tanto maior exposicao quanto maior procura por atendimento e capacidade de registro. A predominancia feminina em ${latestYear} tambem deve ser descrita com cautela, pois diferencas de procura por servicos de saude podem influenciar a distribuicao observada.

Os indicadores de hospitalizacao e obito apontam que a maior parte dos registros nao evoluiu para internacao ou morte, mas a presenca de obitos em todos os anos reforca a relevancia da vigilancia epidemiologica. A letalidade calculada aqui usa todas as notificacoes como denominador; portanto, ela e util para descrever a base, mas nao substitui uma medida clinica restrita a casos confirmados.

## Observacao para o artigo

Como se trata de base secundaria de notificacao, os resultados devem ser interpretados considerando possiveis registros incompletos, campos ignorados/em branco, atrasos de digitacao e alteracoes de encerramento dos casos. Para uma versao final do artigo, recomenda-se informar a data exata de extracao no painel e, se necessario, repetir as analises apenas com casos confirmados.

## Fonte consultada

- Ministerio da Saude. Observatorio de Arboviroses: https://www.gov.br/saude/pt-br/composicao/svsa/cnie/observatorio-de-arboviroses
- Ministerio da Saude. Painel de Monitoramento das Arboviroses: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti/monitoramento-das-arboviroses
`;
  fs.writeFileSync(path.join(root, "artigo_analise_estatistica.md"), md, "utf8");
  console.log(`Concluido. Tabelas em ${tableDir} e figuras em ${figDir}`);
})();
