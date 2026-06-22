const fs = require("fs");
const path = require("path");
const readline = require("readline");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outDir = path.join(root, "outputs", "para");
const tableDir = path.join(outDir, "tables");
const figDir = path.join(outDir, "figures");
fs.mkdirSync(tableDir, { recursive: true });
fs.mkdirSync(figDir, { recursive: true });

const files = fs.readdirSync(dataDir)
  .filter((f) => /^DENGBR(22|23|24|25|26)\.csv$/i.test(f))
  .sort();

if (!files.length) throw new Error(`Nenhum arquivo DENGBR22.csv a DENGBR26.csv encontrado em ${dataDir}`);

const PA_UF_CODE = "15";
const START_YEAR = 2022;
const END_YEAR = 2026;

const annual = new Map();
const monthly = new Map();
const sex = new Map();
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
  const width = 940, left = 190, right = 50, top = 58, barHeight = 28, gap = 10;
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
    svg += `<rect x="${left}" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="#0f766e"/>\n`;
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
    const residenceUf = value(parts, idx, "SG_UF");
    if (residenceUf !== PA_UF_CODE) continue;

    const year = Number.parseInt(value(parts, idx, "NU_ANO"), 10);
    if (!Number.isFinite(year) || year < START_YEAR || year > END_YEAR) continue;

    const yearText = String(year);
    totalRows += 1;
    add(annual, yearText);
    add(sex, `${yearText}|${mapSex(value(parts, idx, "CS_SEXO"))}`);
    add(classFinal, `${yearText}|${mapClass(value(parts, idx, "CLASSI_FIN"))}`);
    add(criterion, `${yearText}|${mapCriterion(value(parts, idx, "CRITERIO"))}`);
    add(evolution, `${yearText}|${mapEvolution(value(parts, idx, "EVOLUCAO"))}`);
    add(hospital, `${yearText}|${mapYesNo(value(parts, idx, "HOSPITALIZ"))}`);

    const age = decodeAge(value(parts, idx, "NU_IDADE_N"));
    add(ageGroup, `${yearText}|${groupAge(age)}`);
    addAge(yearText, age);

    for (const symptom of symptomColumns) add(symptoms, `${yearText}|${symptom}|${mapYesNo(value(parts, idx, symptom))}`);

    const dt = value(parts, idx, "DT_NOTIFIC");
    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
      add(monthly, `${dt.slice(0, 7)}`);
      if (!firstDate || dt < firstDate) firstDate = dt;
      if (!lastDate || dt > lastDate) lastDate = dt;
    }
  }
}

(async () => {
  for (const file of files) await processFile(file);

  const years = [...annual.keys()].sort();
  const annualRows = years.map((year, i) => {
    const cases = get(annual, year);
    const previous = i > 0 ? get(annual, years[i - 1]) : 0;
    const ages = ageStats.get(year) || { n: 0, sum: 0, sumSq: 0, hist: new Map() };
    const hospYes = get(hospital, `${year}|Sim`);
    const deaths = get(evolution, `${year}|Obito pelo agravo`);
    const confirmed = get(classFinal, `${year}|Dengue`) + get(classFinal, `${year}|Dengue com sinais de alarme`) + get(classFinal, `${year}|Dengue grave`);
    const mean = ages.n ? ages.sum / ages.n : 0;
    const sd = ages.n > 1 ? Math.sqrt((ages.sumSq - (ages.sum * ages.sum / ages.n)) / (ages.n - 1)) : 0;
    return {
      ano: year,
      casos_notificados: cases,
      variacao_vs_ano_anterior_percentual: i > 0 && previous ? pct(cases - previous, previous) : "",
      percentual_total_periodo: pct(cases, totalRows),
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

  const monthlyRows = [...monthly.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, casos_notificados]) => ({ mes, casos_notificados }));

  writeRows(path.join(tableDir, "resumo_anual_para.csv"), annualRows);
  writeRows(path.join(tableDir, "casos_mensais_para.csv"), monthlyRows);
  writeCounter(path.join(tableDir, "sexo_por_ano_para.csv"), sex, ["ano", "sexo"]);
  writeCounter(path.join(tableDir, "faixa_etaria_por_ano_para.csv"), ageGroup, ["ano", "faixa_etaria"]);
  writeCounter(path.join(tableDir, "classificacao_final_por_ano_para.csv"), classFinal, ["ano", "classificacao_final"]);
  writeCounter(path.join(tableDir, "criterio_por_ano_para.csv"), criterion, ["ano", "criterio_confirmacao"]);
  writeCounter(path.join(tableDir, "evolucao_por_ano_para.csv"), evolution, ["ano", "evolucao"]);
  writeCounter(path.join(tableDir, "hospitalizacao_por_ano_para.csv"), hospital, ["ano", "hospitalizado"]);
  writeCounter(path.join(tableDir, "sintomas_por_ano_para.csv"), symptoms, ["ano", "sintoma", "resposta"]);

  writeBarSvg(annualRows, "ano", "casos_notificados", "Casos notificados de dengue no Para por ano", path.join(figDir, "casos_por_ano_para.svg"));
  const latestYear = years.at(-1);
  const ageOrder = { "<1": 0, "1-9": 1, "10-19": 2, "20-39": 3, "40-59": 4, "60+": 5 };
  const ageLatest = counterRows(ageGroup, ["ano", "faixa_etaria"])
    .filter((r) => r.ano === latestYear && r.faixa_etaria !== "Ignorado/Branco")
    .sort((a, b) => ageOrder[a.faixa_etaria] - ageOrder[b.faixa_etaria]);
  writeBarSvg(ageLatest, "faixa_etaria", "n", `Casos por faixa etaria no Para em ${latestYear}`, path.join(figDir, `faixa_etaria_para_${latestYear}.svg`));

  const peak = [...annualRows].sort((a, b) => b.casos_notificados - a.casos_notificados)[0];
  const latest = annualRows.find((r) => r.ano === latestYear);
  const latestTotal = latest.casos_notificados;
  const female = get(sex, `${latestYear}|Feminino`);
  const male = get(sex, `${latestYear}|Masculino`);
  const topAge = [...counterRows(ageGroup, ["ano", "faixa_etaria"]).filter((r) => r.ano === latestYear)].sort((a, b) => b.n - a.n)[0];
  const topSymptoms = counterRows(symptoms, ["ano", "sintoma", "resposta"])
    .filter((r) => r.ano === latestYear && r.resposta === "Sim")
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const symptomSentence = topSymptoms.map((r) => `${r.sintoma} (${Number(r.n).toLocaleString("pt-BR")}; ${pct(r.n, latestTotal)}%)`).join("; ");

  const validClosedYears = annualRows.filter((r) => r.ano !== latestYear);
  const closedMean = validClosedYears.reduce((sum, r) => sum + r.casos_notificados, 0) / validClosedYears.length;

  const md = `# Evolucao temporal dos casos de dengue no estado do Para entre 2022 e 2026: uma analise estatistica do periodo pos-pandemia

## Metodo

Foi realizada uma analise estatistica descritiva de notificacoes de dengue de residentes no estado do Para, considerando o campo SG_UF igual a 15. O recorte temporal incluiu os anos de 2022 a 2026, periodo posterior a fase mais critica da pandemia de COVID-19 e marcado pela retomada mais regular dos servicos de vigilancia epidemiologica.

Os dados foram extraidos dos arquivos DENGBR22.csv a DENGBR26.csv, associados ao Painel de Monitoramento das Arboviroses do Ministerio da Saude. Segundo o Ministerio da Saude, o Observatorio de Arboviroses disponibiliza paineis com atualizacao diaria e relatorios semanais sobre a situacao epidemiologica nacional, estadual e municipal.

Foram analisadas ${totalRows.toLocaleString("pt-BR")} notificacoes no Para, com datas entre ${firstDate} e ${lastDate}. As variaveis avaliadas foram ano de notificacao, mes de notificacao, sexo, idade, faixa etaria, classificacao final, criterio de confirmacao, hospitalizacao, evolucao e sintomas clinicos. Foram calculadas frequencias absolutas e relativas, medidas de tendencia central e dispersao para idade, variacao percentual anual e letalidade entre notificacoes.

## Resultados

Entre 2022 e 2026, foram registradas ${totalRows.toLocaleString("pt-BR")} notificacoes de dengue em residentes no Para. O maior volume ocorreu em ${peak.ano}, com ${peak.casos_notificados.toLocaleString("pt-BR")} casos notificados, o que representa ${peak.percentual_total_periodo}% do total do periodo. Considerando apenas os anos fechados de 2022 a 2025, a media anual foi de ${closedMean.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} notificacoes.

Em ${latestYear}, foram observadas ${latestTotal.toLocaleString("pt-BR")} notificacoes ate ${lastDate}. Por se tratar de ano ainda incompleto, esse valor nao deve ser comparado diretamente com anos encerrados. Mesmo assim, ele ajuda a observar a situacao parcial mais recente do estado.

Quanto ao perfil demografico em ${latestYear}, foram registrados ${female.toLocaleString("pt-BR")} casos no sexo feminino (${pct(female, latestTotal)}%) e ${male.toLocaleString("pt-BR")} no sexo masculino (${pct(male, latestTotal)}%). A faixa etaria mais frequente foi ${topAge.faixa_etaria}, com ${Number(topAge.n).toLocaleString("pt-BR")} notificacoes (${pct(topAge.n, latestTotal)}%). A idade media foi de ${latest.idade_media} anos, com mediana de ${latest.idade_mediana} anos e desvio-padrao de ${latest.idade_desvio_padrao} anos.

Em relacao a gravidade, ${latest.hospitalizacoes.toLocaleString("pt-BR")} notificacoes de ${latestYear} tiveram hospitalizacao registrada (${latest.hospitalizacao_percentual}%). Foram identificados ${latest.obitos_pelo_agravo.toLocaleString("pt-BR")} obitos pelo agravo, resultando em letalidade de ${latest.letalidade_notificados_percentual}% entre todas as notificacoes do ano. Os sintomas positivos mais frequentes em ${latestYear} foram: ${symptomSentence}.

## Interpretacao

A serie temporal do Para no periodo pos-pandemia indica oscilacao anual importante, com concentracao de casos em ${peak.ano}. Esse comportamento sugere que a dengue no estado nao seguiu uma tendencia linear simples entre 2022 e 2026, mas sim um padrao de variacao epidemica, em que determinados anos concentram maior transmissao e maior volume de notificacoes.

O recorte pos-pandemia exige cautela interpretativa. A partir de 2022, a rede de vigilancia e os servicos de saude passaram por reorganizacao apos o impacto da COVID-19, o que pode ter influenciado tanto a deteccao quanto o registro dos casos. Assim, mudancas no numero de notificacoes podem refletir alteracoes reais na transmissao, mas tambem mudancas na procura por atendimento, no acesso aos servicos e na oportunidade de digitacao dos dados.

A predominancia de casos em adultos jovens e adultos de meia-idade sugere maior participacao da populacao economicamente ativa nas notificacoes. Esse achado pode estar relacionado a maior circulacao urbana, exposicao ocupacional e procura por atendimento. No entanto, por se tratar de base de notificacoes, nao e possivel afirmar causalidade apenas com estes dados.

Os indicadores de hospitalizacao e obito mostram que a maioria dos casos notificados nao evoluiu para formas graves registradas, mas a existencia de hospitalizacoes e obitos reforca a relevancia da vigilancia continua. A letalidade foi calculada sobre todas as notificacoes, portanto deve ser lida como indicador descritivo da base e nao como taxa clinica definitiva entre casos confirmados.

## Conclusao

A analise dos casos de dengue no Para entre 2022 e 2026 mostra um periodo pos-pandemia marcado por forte variacao temporal, com pico em ${peak.ano} e perfil predominante de notificacoes em adultos. O ano de 2026 ainda e parcial, pois os dados chegam ate ${lastDate}, e deve ser tratado como acompanhamento em andamento. Para aprofundar o estudo, recomenda-se comparar os casos com populacao residente para calcular incidencia, separar casos confirmados de notificacoes totais e avaliar a distribuicao por municipio.

## Fonte consultada

- Ministerio da Saude. Observatorio de Arboviroses: https://www.gov.br/saude/pt-br/composicao/svsa/cnie/observatorio-de-arboviroses
- Ministerio da Saude. Painel de Monitoramento das Arboviroses: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti/monitoramento-das-arboviroses
`;

  fs.writeFileSync(path.join(root, "artigo_para_pos_pandemia.md"), md, "utf8");
  console.log(`Concluido. Analise do Para em ${path.join(root, "artigo_para_pos_pandemia.md")}`);
})();
