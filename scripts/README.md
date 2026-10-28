# Geração das fases (fora do app React)

As fases do WordQuest são geradas antes, validadas e gravadas em `src/data/levels.json`. O app não depende
destes scripts. Só entram no jogo grades **completas** 8×10, com pistas simples e duplas e sem células
isoladas.

## Três camadas

| Camada                                       | Arquivo                       | No repositório?                              |
| -------------------------------------------- | ----------------------------- | -------------------------------------------- |
| Dicionário (palavras que existem)            | `scripts/data/dictionary.txt` | **Não** (gerado localmente, em `.gitignore`) |
| Catálogo de palavras e pistas (nível e tipo) | `scripts/data/catalogo.json`  | Sim                                          |
| Catálogo de fases                            | `src/data/levels.json`        | Sim                                          |

O gerador usa **apenas** palavras que têm pista válida: nenhuma grade é publicada com palavra sem pista.

## Fonte do vocabulário e licença

O dicionário vem do **VERO** (Verificador Ortográfico Livre, versão 3.2, out/2013), de Raimundo Santos Moura e
da comunidade do LibreOffice, pasta `pt_BR` de <https://github.com/LibreOffice/dictionaries>.
Licenciado sob **LGPLv3** e **Mozilla Public License**. Copyright (C) 2006–2013 Raimundo Santos Moura.

- O `.dic` traz só lemas; `build-dictionary.mjs` expande os afixos do `.aff` e guarda formas sem acento de 2 a 7
  letras (sem nomes próprios, siglas nem termos ofensivos).
- A lista derivada **não é versionada**. Para regenerá-la, baixe `pt_BR.dic` e `pt_BR.aff` do repositório acima
  (fora do projeto) e rode:

```sh
node scripts/build-dictionary.mjs <pt_BR.dic> <pt_BR.aff>
```

- `catalogo.json` é conteúdo próprio do projeto (pistas escritas à mão); só serve de entrada ao gerador.

## Fluxo

```sh
node scripts/check-clues.mjs            # valida o catálogo (ver a seção Catálogo mais abaixo)
node scripts/generate-levels.mjs --dry  # testa sem gravar
node scripts/generate-levels.mjs --seed 3 --pool 12 --molds 12000   # grava src/data/levels.json
```

Regras das pistas (`check-clues.mjs`): palavra existente no dicionário; pista de até 18 caracteres, palavras de
até 9 letras e no máximo 2 linhas de 9 caracteres (cabe na metade de uma célula dupla); sem a resposta dentro da
pista; sem pistas repetidas.

O gerador (`scripts/lib/arrowword.mjs`) monta moldes (borda superior/esquerda com pistas, pistas internas,
até 4 blocos), resolve por backtracking com o catálogo de pistas, escolhe a melhor entre `--pool` grades
(mais palavras longas, menos de 2 letras) e não repete palavra entre fases. Com `--report` lista, por palavra,
alternativas do catálogo que também encaixam nos cruzamentos, para revisão de ambiguidade.

Depois de gerar, rode `npx vitest run`: `engine.test.ts` valida densidade, legibilidade das pistas e que cada
fase é concluível só com ações gratuitas.

## Repetição de palavras entre fases

Opções do gerador para controlar a repetição (`generate-levels.mjs`): sem `--reuse` nenhuma palavra se repete
entre as fases escolhidas; `--reuse-short` libera só as de até 3 letras, preferindo as menos usadas
(`--penalty`); `--two`, `--three`, `--minavg` e `--maxslots` limitam as palavras curtas do molde; `--width`
alarga a busca. A cada fase concluída o arquivo é gravado, então dá para retomar com `--only` das restantes.

Medido com o catálogo atual (cerca de 2.400 palavras fáceis, 50 de 2 letras e 190 de 3 letras): sem repetir
palavra, as fases 1 a 8 saem, mas a partir da 9 nenhuma grade 8×10 completa fecha (0 em 30 mil moldes); com
`--reuse` a mesma fase sai em cerca de 90 moldes. A taxa de sucesso cai muito a cada palavra retirada do
vocabulário, então zerar a repetição nas 25 fases pede um vocabulário bem maior (palavras com pista), não só
mais tempo de busca.

## Catálogo de palavras (`scripts/data/catalogo.json`)

Fonte única das grades, das fases e do modo casual. Cada entrada tem `palavra`, `pista`, `nivel`
(`facil`, `medio` ou `dificil`) e `tipo` (`geral` ou o id de um tema do casual: `animais`, `comida`,
`natureza`, `casa`; os nomes dos temas ficam em `themes.json`). O nível manda no vocabulário das fases
(`generate-levels.mjs --tier 1|2|3`, que aceita palavras até aquele nível) e o tipo manda nas grades temáticas
(`generate-casual.mjs`). Os antigos `clues*.txt` foram movidos para `scripts/data/legado/`.

```sh
node scripts/catalogo.mjs --resumo                       # contagem por nível e tipo
node scripts/catalogo.mjs --add novas.txt --nivel facil --tipo animais   # linhas PALAVRA|Pista[|nivel[|tipo]]
node scripts/check-clues.mjs                              # revalida tudo
```

`--add` valida cada linha (dicionário, tamanho da pista, sem a resposta na pista, sem pista repetida) e só
grava as que passam; palavra já existente só é trocada com `--troca`.

### Regra de repetição das fases (`--gap`, `--max-uses`)

`node scripts/generate-levels.mjs --only 1,...,25 --pool 1 --molds 30000 --width 10 --gap 4 --max-uses 4 --penalty 1`:
cada palavra aparece em no máximo 4 fases e duas fases com a mesma palavra ficam pelo menos 4 fases distantes
(a palavra da fase 1 só volta na 5, depois na 9...). A regra vale também contra fases fixas já gravadas (usado
com `--only` de poucas fases). Cada fase precisa ter ao menos uma casa de pista dupla. O catálogo atual fecha as
25 fases com essa regra em cerca de 20 minutos.

## Grades do casual por tema (`generate-casual-tema.mjs`)

Cada grade do casual tem **100% de palavras do tema** (o tipo no catálogo). Como o vocabulário de um tema é
pequeno para fechar uma grade 8×10 densa (testado: nenhuma fechou em milhares de tentativas, mesmo com
palavras curtas de ligação), o gerador monta a grade colocando só palavras do tema, uma a uma, cruzando letras
já postas: cada palavra tem a casa de pista logo antes e nenhuma sequência de letras pode formar palavra fora
da lista. O que sobra vira bloco, então a grade fica mais aberta que a das fases (11 a 12 palavras e cerca de 45
casas de resposta; o motor valida com `PuzzleValidator.validateCasual`, mínimo de 40 casas).

```sh
node scripts/generate-casual-tema.mjs --tries 2500 --min-words 10   # regrava src/data/casual.json
node scripts/check-casual.mjs --min 1                               # confere 100% do tema e grades repetidas
```

O teste `src/tests/casual.test.tsx` também confere que toda resposta é do tema e que as grades de um tema são
todas diferentes. `generate-casual.mjs` (troca de respostas numa grade densa) ficou como alternativa antiga.

O gerador usa busca em feixe (`--beam`, `--branch`; `--shortw` favorece palavras curtas para caber mais). Palavras
que surgem do encontro de letras valem se forem do tema e ganham a própria casa de pista. Sem encostar palavras
paralelas, o teto medido é de 11 a 12 palavras por grade 8×10; mais que isso exigiria trechos densos, que pedem
muitas palavras de 2 letras do tema. Catálogo atual: 3.706 palavras (322 a 365 por tema).

## Ícone e splash (`build-icons.mjs`)

`node scripts/build-icons.mjs` gera o ícone do app e a splash a partir da arte de `public/art` (livro azul do
sprite, logo e vila), usando o Chromium do Playwright: mipmaps do Android (legado, redondo e primeiro plano
adaptativo), `drawable*/splash.jpg` (retrato e paisagem, só Android 11 ou anterior) e os PNGs do PWA em
`public/`. O fundo do ícone adaptativo é `ic_launcher_background` (dourado); no Android 12+ o sistema mostra o
ícone sobre esse fundo (`windowSplashScreenBackground`) e a tela "Preparando sua aventura…" do app continua o
mesmo dourado.
