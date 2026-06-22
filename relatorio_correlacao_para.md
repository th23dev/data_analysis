# Correlacao dos dados de dengue no Para entre 2022 e 2026

## Objetivo

Esta etapa correlaciona os principais indicadores anuais de dengue no estado do Para no periodo pos-pandemia, considerando os anos de 2022 a 2026. A variavel central foi o numero de casos notificados, comparado com confirmacoes, hospitalizacoes, obitos, idade media e percentuais de gravidade.

## Metodo

Foi utilizado o coeficiente de correlacao de Pearson, que varia de -1 a +1. Valores positivos indicam que duas variaveis tendem a crescer juntas; valores negativos indicam que uma variavel tende a diminuir quando a outra aumenta. Como o recorte anual possui apenas 5 observacoes, os resultados devem ser interpretados como exploratorios e descritivos, nao como prova estatistica definitiva.

No periodo, foram analisadas 57.552 notificacoes, 47.877 casos confirmados de dengue, 4.422 hospitalizacoes e 62 obitos pelo agravo.

## Matriz de correlacao com os casos notificados

| Variavel comparada com casos | Pearson r | Direcao | Intensidade |
|---|---:|---|---|
| Casos confirmados de dengue | 0.9976 | positiva | muito forte |
| Hospitalizacoes | 0.8720 | positiva | forte |
| Obitos pelo agravo | 0.6142 | positiva | moderada |
| Idade media | 0.5388 | positiva | moderada |
| Hospitalizacao (%) | 0.0457 | positiva | muito fraca |
| Letalidade entre notificacoes (%) | 0.1556 | positiva | muito fraca |
| Confirmados (%) | 0.8013 | positiva | forte |

## Principais resultados

A correlacao mais forte e positiva ocorreu entre casos notificados e Casos confirmados de dengue, com r = 0.9976. Isso indica que, nos anos em que houve mais notificacoes, essa variavel tambem aumentou de forma muito proxima.

A associacao mais fraca ocorreu entre casos notificados e Hospitalizacao (%), com r = 0.0457. Esse resultado mostra que essa proporcao praticamente nao acompanhou o aumento absoluto de casos no periodo.

A correlacao entre ano e casos notificados foi r = 0.3125, indicando associacao positiva fraca entre a passagem dos anos e o volume anual de notificacoes. Esse resultado reforca que a serie nao teve crescimento linear simples, pois houve pico em 2024 e reducao posterior.

Considerando a serie mensal disponivel, a correlacao entre a ordem temporal dos meses e o numero de casos foi r = 0.2700. Esse resultado tambem deve ser lido com cautela, pois a sazonalidade da dengue pode produzir picos em meses especificos, sem representar uma tendencia linear constante.

## Interpretacao

A alta correlacao entre notificacoes e casos confirmados era esperada, pois os confirmados fazem parte do conjunto das notificacoes. Isso mostra consistencia interna da base: quando o volume notificado aumenta, o volume confirmado tambem aumenta.

A associacao entre casos e hospitalizacoes tambem e positiva, indicando que anos com mais notificacoes tendem a registrar mais internacoes em termos absolutos. Entretanto, o percentual de hospitalizacao nao necessariamente cresce junto com o total de casos. Essa diferenca e importante: numero absoluto e proporcao medem coisas diferentes.

Os obitos apresentam correlacao positiva com os casos, mas a letalidade percentual pode variar de modo diferente. Isso ocorre porque a letalidade depende nao apenas do numero total de casos, mas tambem da gravidade dos casos, acesso ao atendimento, oportunidade de diagnostico, encerramento das fichas e qualidade do preenchimento.

## Conclusao

Os dados do Para entre 2022 e 2026 indicam que o aumento dos casos notificados esta fortemente associado ao aumento dos casos confirmados e das hospitalizacoes absolutas. Ainda assim, os percentuais de hospitalizacao, confirmacao e letalidade nao devem ser interpretados como simples consequencia do volume total de casos, pois dependem de filtros epidemiologicos e da completude dos registros.

Para o artigo, a leitura mais adequada e que a serie pos-pandemia apresenta correlacao forte entre volume de notificacoes e carga assistencial absoluta, mas nao permite afirmar causalidade nem tendencia linear estavel devido ao pequeno numero de anos e ao pico concentrado em 2024.
