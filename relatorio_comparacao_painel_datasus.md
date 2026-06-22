# Comparacao entre dados do painel de monitoramento e DataSUS/SINAN

## Objetivo

Verificar se os arquivos usados na analise da dengue no Para entre 2022 e 2026 apresentam diferenca em relacao aos arquivos oficiais publicados no Portal de Dados Abertos do SUS, conjunto Sinan/Dengue.

## Fontes verificadas

- Painel de Monitoramento das Arboviroses, Ministerio da Saude:
  https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/a/aedes-aegypti/monitoramento-das-arboviroses
- Portal de Dados Abertos do SUS, conjunto Sinan/Dengue:
  https://dadosabertos.saude.gov.br/dataset/arboviroses-dengue
- Arquivos oficiais baixados do DataSUS/SINAN:
  - DENGBR22.csv.zip
  - DENGBR23.csv.zip
  - DENGBR24.csv.zip
  - DENGBR25.csv.zip
  - DENGBR26.csv.zip

## Resultado da comparacao tecnica

Os arquivos locais usados no projeto foram comparados com os arquivos oficiais baixados diretamente do DataSUS/SINAN por tamanho em bytes e hash SHA256. O resultado mostra que os arquivos sao iguais byte a byte.

| Arquivo | Tamanho local | Tamanho DataSUS | Iguais |
|---|---:|---:|---|
| DENGBR22.csv | 392.961.379 | 392.961.379 | Sim |
| DENGBR23.csv | 463.682.540 | 463.682.540 | Sim |
| DENGBR24.csv | 1.840.398.627 | 1.840.398.627 | Sim |
| DENGBR25.csv | 457.197.205 | 457.197.205 | Sim |
| DENGBR26.csv | 104.413.857 | 104.413.857 | Sim |

## Interpretacao

Nao foi encontrado erro nos arquivos locais em relacao aos arquivos oficiais do DataSUS/SINAN. Para o recorte de 2022 a 2026, os dados usados no projeto sao identicos aos arquivos oficiais baixados do Portal de Dados Abertos do SUS.

Isso significa que a analise feita no projeto esta baseada na mesma base bruta publicada oficialmente pelo DataSUS/SINAN. Portanto, se houver diferenca entre algum numero visto no painel interativo e o resultado calculado localmente, a causa mais provavel nao e arquivo corrompido ou base local errada, mas sim diferenca de filtro, definicao epidemiologica ou momento de atualizacao.

## Possiveis causas de diferenca entre painel e DataSUS

O proprio Portal de Dados Abertos do SUS informa que as bases de dengue podem apresentar pequenas divergencias em relacao aos dados disponibilizados pela CGARB, pois a serie historica pode usar bases congeladas em datas especificas, enquanto dados recentes podem ser atualizados diariamente no painel.

Assim, diferencas podem ocorrer por:

- uso de notificacoes totais versus casos provaveis;
- filtro por local de residencia versus local de notificacao;
- exclusao ou inclusao de casos descartados;
- diferenca entre ano de notificacao, semana epidemiologica e data de primeiros sintomas;
- atualizacao diaria do painel para anos recentes;
- encerramento tardio de casos, especialmente em 2025 e 2026;
- filtros de classificacao final, criterio de confirmacao e evolucao.

## Conclusao

Para os arquivos DENGBR22.csv a DENGBR26.csv, nao ha divergencia entre os dados locais e os arquivos oficiais do DataSUS/SINAN. Eles sao iguais. A comparacao com o painel de monitoramento deve ser feita com cuidado, porque o painel pode aplicar filtros epidemiologicos e atualizacoes diferentes da base bruta baixada.

Para o artigo, a formulacao mais segura e: "Os dados analisados correspondem aos arquivos oficiais Sinan/Dengue publicados no Portal de Dados Abertos do SUS. A comparacao por hash SHA256 confirmou que os arquivos locais sao identicos aos arquivos oficiais baixados. Eventuais diferencas em relacao ao painel interativo do Ministerio da Saude podem decorrer de filtros, atualizacoes diarias ou criterios de classificacao aplicados pelo painel."

