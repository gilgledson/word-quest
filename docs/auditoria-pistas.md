# Auditoria das pistas em uso

Revisão das **607 respostas** que aparecem nas 25 fases e nas 24 grades do casual (as pistas do catálogo
inteiro, 3.706 entradas, passam por `scripts/check-clues.mjs`, que só confere forma: tamanho, repetição,
resposta dentro da pista e dicionário). Aqui a leitura foi de **sentido**: pista errada, vaga ou que serve a
mais de uma resposta. Todas as pistas em uso são iguais às do catálogo e não há pista repetida entre elas.

## Corrigidas (catálogo, fases e casual)

| Resposta | Antes | Depois | Motivo |
|---|---|---|---|
| BOA | Cobra gigante | Cobra sem veneno | "Gigante" serve melhor à sucuri; a jiboia/boa é constritora sem veneno |
| OCA | Casa de índio | Casa indígena | Termo datado |
| FIGO | Fruta de Adão | Fruta da figueira | Pista obscura |
| OBRA | Canteiro | Reforma da casa | "Canteiro" também é de flores |
| LENHA | Lasca de fogueira | Pau para queimar | Pista imprecisa |
| MAIORES | Mais grandes | De maior tamanho | Português incorreto |
| TACA | Prêmio do campeão | Serve sorvete | No tema Comida, a pista era de troféu |
| TACO | Bastão do golfe | Prato mexicano | No tema Comida, a pista era de golfe |
| URSO | Mamífero de garras | Come mel e peixe | Servia a vários animais |
| BLOCO | Cubo de pedra | Peça maciça | Bloco não é necessariamente cubo nem de pedra |
| CAPAS | Cobrem | Protegem o sofá | Vaga demais |
| DE | Indica posse | Posse ou origem | Incompleta |

## Revisão das outras 3.099 pistas do catálogo (fora de uso)

Lidas em blocos por ordem alfabética. Foram corrigidas **33 pistas** e **5 temas** (o tema é o `tipo` da entrada,
que decide em qual tema do casual a palavra pode entrar):

| Resposta | Antes | Depois | Motivo |
|---|---|---|---|
| ALCOOL | Bebida forte | Líquido da pinga | Álcool é a substância, não a bebida |
| AMADOR | Sem profissão | Quem faz por gosto | Amador não é "sem profissão" |
| AMENDOA | Semente de bolo | Base do marzipã | Pista sem sentido |
| BEIJO | Selinho | Toque de lábios | Selinho é um tipo de beijo (sentido invertido) |
| CAROLA | Ave de cerrado | Devota em excesso | Pista duvidosa; tema passou de animais a geral |
| CREME | Natas, nata | Cobertura do doce | Pista repetia a palavra |
| CULPA | Erro assumido | Falha de alguém | Culpa não é erro assumido |
| CUTIA | Roedor de quintal | Enterra sementes | Cutia vive na mata |
| DEZEMBRO | Mês do verão | Começo do verão | Servia a janeiro e fevereiro |
| DIREITO | Lado da mão forte | Oposto de esquerdo | Canhotos têm a mão forte à esquerda |
| ENGUIA | Peixe de choque | Peixe comprido | O de choque é o poraquê |
| ESPIGA | Cabo do milho | Cacho do milho | Espiga não é cabo |
| ESTACAO | Parada do trem (tema natureza) | Inverno ou verão | Pista não combinava com o tema |
| ESTAGIO | Fase da lua (tema natureza) | Treino no emprego | Estágio não é fase da lua; tema geral |
| FRONHA | Capa de fofura | Capa de almofada | Pista sem sentido |
| LIGADO | Acesso | Aceso, em uso | Erro de digitação |
| MACAS | Frutas vermelhas | Frutas do pomar | Maçã não é "fruta vermelha" (frutas vermelhas são morango etc.) |
| OITO | Número | Depois do sete | Servia a qualquer número |
| VO, AVO, VOVO | Mãe do pai, Pai do pai, Mãe da mãe | Mãe/Pai de um dos pais, Avó no carinho | "Do pai" excluía a avó materna |
| ARROZAL, ARVOREDO, CAMPONES, CANAVIAL, CAVALEIRO, COLHEITA, ESCULTOR | pistas que repetiam a raiz da resposta | pistas sem a raiz | A pista entregava a resposta |
| TRIGAL, SENTIR, VINTE, COPA | Plantação de trigo, Tocar com a pele, Dois vezes dez, Torneio mundial (tema natureza) | Campo dourado, Ter uma emoção, Duas vezes dez, Topo da árvore | Raiz repetida, pista estreita, erro de concordância, tema trocado |
| MAIORES | De maior tamanho | Acima em tamanho | A pista repetia a raiz |

Temas corrigidos sem mudar a pista: **ESTRELA** (animais para natureza), **TAPETE** (comida para casa) e **GAMBA**
(animais para geral).

## Em aberto

- **IA** ("Passado de ir"), **TI** ("Pronome: a você") e **TE** ("Pronome: a ti") são pistas ambíguas ou confusas
  entre si; palavras de 2 letras com pistas gramaticais são difíceis de escrever sem ambiguidade.
- **ODA** e **ODE** têm pistas quase iguais ("Poema de elogio" e "Poema de louvor").
- **CABINE** ("Cômodo de avião") está no tema Casa e não combina; o certo é trocar a palavra da grade.
- Sobram 18 pistas que repetem a raiz da resposta em **palavras derivadas** (PANELAO "Panela enorme", TIJOLINHO
  "Pequeno tijolo", LARANJADA "Suco de laranja"...). Em palavra derivada isso é comum e aceitável, então ficaram.
- **FAVELA** ("Bairro de morro") e **INDIO** ("Povo nativo") valem uma decisão sua sobre o tom desejado.
- O catálogo expandido (`catalogo_expandido_corrigido.json`) ainda não foi revisado nem incorporado.

## Revisão de vocabulário cotidiano (30/10/2026)

Critério: palavras do dia a dia, fáceis de reconhecer; o desafio deve estar nas letras e na corrida contra o rival.

- 607 respostas distintas em 910 usos; cerca de 50 palavras pouco cotidianas, em 78 usos (mundos 2 a 5 e modo casual).
- 16 usos trocados por palavras comuns que cabem nos mesmos cruzamentos: AVAL→OVAL, LAPA→LATA, ZE→PE, AIA→ABA
  (fases) e TEIU→PERU/LEAO, MUTUM→SAGUI, MUAR/GAIO→BODE, JACU→ONCA, SAFRA→CEDRO, HERA→NEVE, SEIVA→BRISA,
  JAMBO→GALHO, GEO→CEU, AREAL→AREIA (casual, sempre do mesmo tema).
- Pistas mais claras: ICAR, BIO, CIA, EGIDE, AFAGO.
- As 44 palavras pouco cotidianas ficaram marcadas como `medio` no catálogo (o gerador ainda não filtra por nível).
- Pendentes: palavras totalmente cruzadas que não têm substituto sem regerar a fase (EPOPEIA, IGAPO, OBOLO, EGIDE,
  MERCE, MOER, CAPATAZ…) e itens do casual sem opção do mesmo tema (ANIS, GEO, ATOL, HERA, RELVA).

## OBOLO fora da fase 5 (01/11/2026)

- A fase 5 (vila-5) foi regerada sem OBOLO, ACARA e OCASO (marcadas como `medio` no catálogo, fora do perfil fácil).
  A grade nova usa só palavras comuns (MILITAR, TRATOR, ABACATE, CANAL, AGORA...).
- Continuam pendentes as demais palavras totalmente cruzadas sem substituto (EPOPEIA, IGAPO, EGIDE, MERCE, MOER,
  CAPATAZ…): cada uma exige regerar a fase em que aparece.

## Revisão completa do vocabulário fácil (01/11/2026)

- Leitura de todas as 3.302 palavras marcadas como `facil` (catálogo de 3.706). Critério: um adulto brasileiro
  reconhece a palavra no dia a dia, sem contexto técnico, literário, regional ou antigo.
- 197 palavras pouco cotidianas passaram a `medio` (ex.: ACERVO, ALCATRAZ, ARAUTO, BRUMA, CETRO, DOGMA, FULGOR,
  HERA, HIDROMEL, LACAIO, MEANDRO, OLIMPO, QUIMERA, SALTEADOR, SOLSTICIO, UMBRAL), mais ACARA e OCASO. O gerador
  de fases só usa `facil` no perfil fácil, então elas deixam de entrar em fases novas.
- ASNO ficou como `facil` (conhecida e usada no tutorial). O resto do catálogo `facil` ficou como estava.
- Em uso nas fases e no casual, só 7 das 197 apareciam; GNU→BOI no casual foi trocado na hora. As demais
  (HERA, BALSAMO, CE, OSA, PELAGEM) estão totalmente cruzadas e só saem regerando a grade.
- Palavras fora do nível fácil ainda em uso: 43 (lista completa pelos ids em `src/data/levels.json` e
  `src/data/casual.json`), com destaque para as das fases iniciais: EPOPEIA (vila-3), AIS e OVAL (vila-1), AUGE e
  ICAR (vila-2), IGAPO e HERA (vila-4).
