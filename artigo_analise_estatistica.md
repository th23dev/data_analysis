# Analise estatistica dos dados de dengue

## Metodo

Foi realizado um estudo descritivo com dados secundarios de notificacoes de dengue registradas nos arquivos DENGBR20.csv a DENGBR26.csv. A origem dos dados foi associada ao Painel de Monitoramento das Arboviroses do Ministerio da Saude, disponivel no gov.br, dentro do Observatorio de Arboviroses. Segundo o Ministerio da Saude, o observatorio disponibiliza paineis de monitoramento com atualizacao diaria e relatorios semanais sobre a situacao epidemiologica nacional, estadual e municipal.

Foram analisadas 14.162.545 notificacoes no periodo de 2019-12-29 a 2026-06-14. As variaveis selecionadas foram ano de notificacao, sexo, raca/cor, idade, faixa etaria, classificacao final, criterio de confirmacao, hospitalizacao, evolucao e sintomas clinicos. A idade foi decodificada a partir do campo NU_IDADE_N e agrupada em <1, 1-9, 10-19, 20-39, 40-59 e 60+ anos.

Foram calculadas frequencias absolutas e relativas para variaveis categoricas. Para idade, calcularam-se media, mediana aproximada em anos completos e desvio-padrao. A letalidade foi estimada pela proporcao de obitos pelo agravo entre o total de notificacoes do respectivo ano. As tabelas completas estao em outputs/tables e as figuras em outputs/figures.

## Resultados

No periodo analisado, foram identificadas 14.162.545 notificacoes. O ano com maior volume foi 2024, com 6.567.131 registros (46.37% do total). Em 2026, foram observadas 388.875 notificacoes, com idade media de 31.95 anos, mediana de 29.00 anos e desvio-padrao de 19.35 anos.

O ano de 2024 concentrou quase metade de todas as notificacoes da serie analisada, indicando um pico epidemiologico muito superior aos demais anos do recorte. Ja 2026 deve ser interpretado como ano incompleto, pois os dados disponiveis chegam ate 2026-06-14. Assim, a comparacao direta de 2026 com anos fechados pode subestimar o volume anual real.

Quanto ao sexo em 2026, foram registrados 210.295 casos no sexo feminino (54.08%) e 178.225 no sexo masculino (45.83%). A faixa etaria mais frequente nesse ano foi 20-39, com 146.606 notificacoes (37.70%).

A hospitalizacao em 2026 foi registrada em 20.990 notificacoes (5.40%). Foram registrados 213 obitos pelo agravo, correspondendo a letalidade de 0.0548% entre as notificacoes. Os sintomas com maior frequencia de resposta positiva em 2026 foram: FEBRE (325.110; 83.60%); MIALGIA (294.861; 75.82%); CEFALEIA (293.645; 75.51%); NAUSEA (155.244; 39.92%); VOMITO (109.202; 28.08%).

## Interpretacao

Os dados mostram comportamento fortemente concentrado no ano de 2024, que foi o principal responsavel pelo volume total de notificacoes entre 2020 e 2026. Essa concentracao sugere que a serie nao apresenta crescimento linear simples, mas sim um padrao de surto/epidemia com grande oscilacao anual.

Em relacao ao perfil dos casos, a maior frequencia em adultos de 20 a 39 anos indica maior registro em populacao economicamente ativa. Entretanto, como a base representa notificacoes, esse resultado pode refletir tanto maior exposicao quanto maior procura por atendimento e capacidade de registro. A predominancia feminina em 2026 tambem deve ser descrita com cautela, pois diferencas de procura por servicos de saude podem influenciar a distribuicao observada.

Os indicadores de hospitalizacao e obito apontam que a maior parte dos registros nao evoluiu para internacao ou morte, mas a presenca de obitos em todos os anos reforca a relevancia da vigilancia epidemiologica. A letalidade calculada aqui usa todas as notificacoes como denominador; portanto, ela e util para descrever a base, mas nao substitui uma medida clinica restrita a casos confirmados.

## Observacao para o artigo

Como se trata de base secundaria de notificacao, os resultados devem ser interpretados considerando possiveis registros incompletos, campos ignorados/em branco, atrasos de digitacao e alteracoes de encerramento dos casos. Para uma versao final do artigo, recomenda-se informar a data exata de extracao no painel e, se necessario, repetir as analises apenas com casos confirmados.

## Fonte consultada

- Ministerio da Saude. Observatorio de Arboviroses: https://www.gov.br/saude/pt-br/composicao/svsa/cnie/observatorio-de-arboviroses
- Ministerio da Saude. Painel de Monitoramento das Arboviroses: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti/monitoramento-das-arboviroses
