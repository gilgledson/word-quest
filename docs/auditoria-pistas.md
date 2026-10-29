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

## Em aberto

- **IA** ("Passado de ir"), **TI** ("Pronome: a você") e **TE** ("Pronome: a ti") são pistas ambíguas ou confusas
  entre si; palavras de 2 letras com pistas gramaticais são difíceis de escrever sem ambiguidade.
- **ODA** e **ODE** têm pistas quase iguais ("Poema de elogio" e "Poema de louvor").
- **CABINE** ("Cômodo de avião") está no tema Casa e não combina; o certo é trocar a palavra da grade.
- No catálogo inteiro, 30 pistas repetem o começo da resposta (ex.: ARROZAL "Plantação de arroz"), o que
  entrega a resposta; a lista sai com a checagem de prefixo de 5 letras usada na auditoria.
