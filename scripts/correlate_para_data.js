const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const tableDir = path.join(root, "outputs", "para", "tables");
const annualFile = path.join(tableDir, "resumo_anual_para.csv");
const monthlyFile = path.join(tableDir, "casos_mensais_para.csv");
const outFile = path.join(root, "relatorio_correlacao_para.md");
const corrCsvFile = path.join(tableDir, "correlacoes_anuais_para.csv");

function parseCsv(content) {
  const clean = content.replace(/^\uFEFF/, "").trim();
  const [headerLine, ...lines] = clean.split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, i) => row[header] = values[i] ?? "");
    return row;
  });
}

function num(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function pearson(x, y) {
  const pairs = x.map((value, i) => [value, y[i]]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pairs.length < 2) return null;
  const xs = pairs.map(([a]) => a);
  const ys = pairs.map(([, b]) => b);
  const mx = mean(xs);
  const my = mean(ys);
  let numerator = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    numerator += dx * dy;
    sx += dx * dx;
    sy += dy * dy;
  }
  const denominator = Math.sqrt(sx * sy);
  return denominator ? numerator / denominator : null;
}

function classify(r) {
  const abs = Math.abs(r);
  if (abs >= 0.9) return "muito forte";
  if (abs >= 0.7) return "forte";
  if (abs >= 0.5) return "moderada";
  if (abs >= 0.3) return "fraca";
  return "muito fraca";
}

function direction(r) {
  return r >= 0 ? "positiva" : "negativa";
}

function pct(part, total) {
  return total ? ((part / total) * 100).toFixed(2) : "0.00";
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function writeCsv(file, rows) {
  const cols = Object.keys(rows[0]);
  const content = [cols.join(","), ...rows.map((row) => cols.map((col) => csvEscape(row[col])).join(","))].join("\n");
  fs.writeFileSync(file, `\uFEFF${content}\n`, "utf8");
}

const annualRows = parseCsv(fs.readFileSync(annualFile, "utf8"));
const monthlyRows = fs.existsSync(monthlyFile) ? parseCsv(fs.readFileSync(monthlyFile, "utf8")) : [];

const annual = annualRows.map((row) => ({
  ano: num(row.ano),
  casos: num(row.casos_notificados),
  confirmados: num(row.casos_confirmados_dengue),
  hospitalizacoes: num(row.hospitalizacoes),
  obitos: num(row.obitos_pelo_agravo),
  idade_media: num(row.idade_media),
  hospitalizacao_percentual: num(row.hospitalizacao_percentual),
  letalidade_percentual: num(row.letalidade_notificados_percentual),
  confirmados_percentual: num(row.confirmados_percentual),
}));

const variables = {
  casos: "Casos notificados",
  confirmados: "Casos confirmados de dengue",
  hospitalizacoes: "Hospitalizacoes",
  obitos: "Obitos pelo agravo",
  idade_media: "Idade media",
  hospitalizacao_percentual: "Hospitalizacao (%)",
  letalidade_percentual: "Letalidade entre notificacoes (%)",
  confirmados_percentual: "Confirmados (%)",
};

const cases = annual.map((row) => row.casos);
const corrRows = Object.entries(variables)
  .filter(([key]) => key !== "casos")
  .map(([key, label]) => {
    const r = pearson(cases, annual.map((row) => row[key]));
    return {
      variavel_comparada_com_casos: label,
      correlacao_pearson_r: r === null ? "" : r.toFixed(4),
      direcao: r === null ? "" : direction(r),
      intensidade: r === null ? "" : classify(r),
      observacoes: "n=5 anos; resultado descritivo",
    };
  });

const yearCorr = pearson(annual.map((row) => row.ano), cases);
const monthlyIndex = monthlyRows.map((_, i) => i + 1);
const monthlyCases = monthlyRows.map((row) => num(row.casos_notificados));
const monthlyTrendCorr = monthlyRows.length ? pearson(monthlyIndex, monthlyCases) : null;

writeCsv(corrCsvFile, corrRows);

const strongestPositive = [...corrRows]
  .filter((row) => row.correlacao_pearson_r !== "")
  .sort((a, b) => Number(b.correlacao_pearson_r) - Number(a.correlacao_pearson_r))[0];
const weakestAssociation = [...corrRows]
  .filter((row) => row.correlacao_pearson_r !== "")
  .sort((a, b) => Math.abs(Number(a.correlacao_pearson_r)) - Math.abs(Number(b.correlacao_pearson_r)))[0];

const totalCases = annual.reduce((sum, row) => sum + row.casos, 0);
const totalHosp = annual.reduce((sum, row) => sum + row.hospitalizacoes, 0);
const totalDeaths = annual.reduce((sum, row) => sum + row.obitos, 0);
const totalConfirmed = annual.reduce((sum, row) => sum + row.confirmados, 0);

const table = corrRows.map((row) =>
  `| ${row.variavel_comparada_com_casos} | ${row.correlacao_pearson_r} | ${row.direcao} | ${row.intensidade} |`
).join("\n");

const md = `# Correlacao dos dados de dengue no Para entre 2022 e 2026

## Objetivo

Esta etapa correlaciona os principais indicadores anuais de dengue no estado do Para no periodo pos-pandemia, considerando os anos de 2022 a 2026. A variavel central foi o numero de casos notificados, comparado com confirmacoes, hospitalizacoes, obitos, idade media e percentuais de gravidade.

## Metodo

Foi utilizado o coeficiente de correlacao de Pearson, que varia de -1 a +1. Valores positivos indicam que duas variaveis tendem a crescer juntas; valores negativos indicam que uma variavel tende a diminuir quando a outra aumenta. Como o recorte anual possui apenas 5 observacoes, os resultados devem ser interpretados como exploratorios e descritivos, nao como prova estatistica definitiva.

No periodo, foram analisadas ${totalCases.toLocaleString("pt-BR")} notificacoes, ${totalConfirmed.toLocaleString("pt-BR")} casos confirmados de dengue, ${totalHosp.toLocaleString("pt-BR")} hospitalizacoes e ${totalDeaths.toLocaleString("pt-BR")} obitos pelo agravo.

## Matriz de correlacao com os casos notificados

| Variavel comparada com casos | Pearson r | Direcao | Intensidade |
|---|---:|---|---|
${table}

## Principais resultados

A correlacao mais forte e positiva ocorreu entre casos notificados e ${strongestPositive.variavel_comparada_com_casos}, com r = ${strongestPositive.correlacao_pearson_r}. Isso indica que, nos anos em que houve mais notificacoes, essa variavel tambem aumentou de forma muito proxima.

A associacao mais fraca ocorreu entre casos notificados e ${weakestAssociation.variavel_comparada_com_casos}, com r = ${weakestAssociation.correlacao_pearson_r}. Esse resultado mostra que essa proporcao praticamente nao acompanhou o aumento absoluto de casos no periodo.

A correlacao entre ano e casos notificados foi r = ${yearCorr.toFixed(4)}, indicando associacao ${direction(yearCorr)} ${classify(yearCorr)} entre a passagem dos anos e o volume anual de notificacoes. Esse resultado reforca que a serie nao teve crescimento linear simples, pois houve pico em 2024 e reducao posterior.

Considerando a serie mensal disponivel, a correlacao entre a ordem temporal dos meses e o numero de casos foi r = ${monthlyTrendCorr.toFixed(4)}. Esse resultado tambem deve ser lido com cautela, pois a sazonalidade da dengue pode produzir picos em meses especificos, sem representar uma tendencia linear constante.

## Interpretacao

A alta correlacao entre notificacoes e casos confirmados era esperada, pois os confirmados fazem parte do conjunto das notificacoes. Isso mostra consistencia interna da base: quando o volume notificado aumenta, o volume confirmado tambem aumenta.

A associacao entre casos e hospitalizacoes tambem e positiva, indicando que anos com mais notificacoes tendem a registrar mais internacoes em termos absolutos. Entretanto, o percentual de hospitalizacao nao necessariamente cresce junto com o total de casos. Essa diferenca e importante: numero absoluto e proporcao medem coisas diferentes.

Os obitos apresentam correlacao positiva com os casos, mas a letalidade percentual pode variar de modo diferente. Isso ocorre porque a letalidade depende nao apenas do numero total de casos, mas tambem da gravidade dos casos, acesso ao atendimento, oportunidade de diagnostico, encerramento das fichas e qualidade do preenchimento.

## Conclusao

Os dados do Para entre 2022 e 2026 indicam que o aumento dos casos notificados esta fortemente associado ao aumento dos casos confirmados e das hospitalizacoes absolutas. Ainda assim, os percentuais de hospitalizacao, confirmacao e letalidade nao devem ser interpretados como simples consequencia do volume total de casos, pois dependem de filtros epidemiologicos e da completude dos registros.

Para o artigo, a leitura mais adequada e que a serie pos-pandemia apresenta correlacao forte entre volume de notificacoes e carga assistencial absoluta, mas nao permite afirmar causalidade nem tendencia linear estavel devido ao pequeno numero de anos e ao pico concentrado em 2024.
`;

fs.writeFileSync(outFile, md, "utf8");
console.log(`Concluido: ${outFile}`);
