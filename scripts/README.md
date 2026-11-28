# Geração das fases (fora do app React)

As fases do WordQuest são geradas antes, validadas e gravadas em `src/data/levels.json`. O app não depende
destes scripts. Só entram no jogo grades **completas**, com pistas simples e duplas e sem células
isoladas. A grade cresce um passo a cada mundo, até 8×8 (`LEVEL_GRIDS` em `src/game/engine/types.ts`); a 8×10 fica
para os temas do Casual:

| Mundo    | Fases | Grade (colunas×linhas) | Comando                                                 |
| -------- | ----- | ---------------------- | ------------------------------------------------------- |
| Vila     | 1–5   | 6×6                    | `--only 1,2,3,4,5 --rows 6 --cols 6 --reuse-short`      |
| Floresta | 6–10  | 6×7                    | `--only 6,7,8,9,10 --rows 7 --cols 6 --reuse-short`     |
| Deserto  | 11–15 | 7×7                    | `--only 11,12,13,14,15 --rows 7 --cols 7 --reuse-short` |
| Reino    | 16–20 | 7×8                    | `--only 16,17,18,19,20 --rows 8 --cols 7 --reuse-short` |
| Ilhas    | 21–25 | 8×8                    | `--only 21,22,23,24,25 --rows 8 --cols 8 --reuse-short` |

Cada palavra tem duas pistas: a `pista` curta (cabe na casa da grade) e a `dica`, a pista completa do painel
da palavra selecionada (até 70 caracteres, sem a resposta). `node scripts/apply-dicas.mjs dicas.txt` grava
dicas novas (linhas `PALAVRA|pista completa`) no catálogo e copia as do catálogo para fases e variantes.

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

## Conteúdo sem atualizar o app

Fases, variantes, temas do casual, mundos e rivais podem ser publicados no servidor e chegam aos
jogadores na próxima abertura do app, sem passar pela Play Store.

- **Fonte:** os mesmos arquivos que vão no app: `src/data/levels.json`, `level-variants.json`,
  `casual.json`, `worlds.json` e `opponents.json` (rivais e o rival de cada fase).
- **Imagens novas:** ficam em `content/hosting/art/...` e são citadas pelo endereço
  `https://wordquest-online.web.app/art/...`. Um rival novo leva `"art": "https://wordquest-online.web.app/art/rivais/<nome>-v1"`
  e os seis arquivos `<nome>-v1-<humor>.webp` (neutral, thinking, happy, angry, sad, surprised).
  Mapas novos seguem o tamanho dos atuais (848×1264). Ao trocar uma imagem, troque o nome (`-v2`):
  o aparelho guarda cada endereço para sempre.
- **Mundo novo:** acrescente em `worlds.json`, gere as fases com `generate-levels.mjs --only 26,27,...`
  e defina o rival de cada fase em `opponents.json` (`byLevel`).

```sh
node scripts/publish-content.mjs            # monta e confere, sem publicar
npx firebase-tools login                    # uma vez, com a conta dona do projeto
node scripts/publish-content.mjs --deploy   # confere e publica
```

A conferência roda a validação do app, joga cada grade até o fim só com ações gratuitas e exige que
toda imagem citada exista em `content/hosting`. Se algo falhar, nada é publicado. O `--deploy`
publica as imagens (Firebase Hosting) e as regras do banco (`database.rules.json`), e por último
grava o conteúdo em `content/` no Realtime Database.

No aparelho (`src/content`): na abertura vale o último conteúdo baixado que passar na validação;
depois o app confere se há versão nova, baixa, valida e guarda para a próxima abertura, adiantando
as imagens do mundo seguinte. Sem internet, segue com o que tem; o conteúdo do app é o mínimo.

## Conteúdo em inglês (`--lang en`)

O inglês tem conteúdo próprio (não é tradução do português): catálogo, temas, fases, variantes,
mundos e rivais. Todos os scripts acima aceitam `--lang en` (ou `WQ_LANG=en`): leem de
`scripts/data/en/` (`catalogo.json`, `themes.json`, `dictionary.txt`) e gravam em `src/data/en/`
(`levels.json`, `level-variants.json`, `casual.json`; `worlds.json` e `opponents.json` são escritos à
mão). O app só carrega `src/data/en` quando o jogo está em inglês.

- **Dicionário:** ENABLE (Enhanced North American Benchmark Lexicon, domínio público). Também não é
  versionado: baixe `enable1.txt` de <https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt>
  (fora do projeto) e rode `node scripts/build-dictionary-en.mjs <enable1.txt>`.
- **Mundos:** `village`, `forest`, `desert`, `kingdom`, `islands` (ids próprios: o progresso de cada
  idioma fica separado). A arte dos mapas, dos temas e dos rivais é a mesma do português.

```sh
node scripts/check-clues.mjs --lang en
node scripts/catalogo.mjs --lang en --add novas.txt     # linhas WORD|clue|nivel|tipo|dica
# Aventura: um mundo por vez, como no português (ver a tabela no começo)
node scripts/generate-levels.mjs --lang en --only 1,2,3,4,5 --rows 6 --cols 6 --reuse-short
node scripts/generate-levels.mjs --lang en --only 24,25 --rows 8 --cols 8 --reuse --molds 30000
# Variantes: copie src/data/en/levels.json, regenere com outro --seed (--out na cópia) e junte
WQ_LANG=en node scripts/build-variants.mjs seed2.json seed3.json
# Casual: o 8×10 primeiro (regrava tudo), depois os outros tamanhos
node scripts/generate-casual-tema.mjs --lang en --count 6 --min-words 10 --tries 2500
node scripts/generate-casual-tema.mjs --lang en --rows 6 --cols 6 --count 8 --min-words 6 --tries 1500
node scripts/check-casual.mjs --lang en --min 1
node scripts/publish-content.mjs --lang en            # confere; com --deploy publica em /content-en
```

O conteúdo publicado do inglês fica em `content-en/` no Realtime Database (o português segue em
`content/`, que os apps antigos leem). `src/tests/i18n-conteudo.test.tsx` valida o conteúdo em inglês
e joga cada grade até o fim.

## Conteúdo em espanhol (`--lang es`)

Mesmo caminho do inglês: entradas em `scripts/data/es/` e conteúdo do app em `src/data/es/`. Plano em
`docs/planos/versao-espanhol.md`.

- **Dicionário:** RLA-ES (Santiago Bosio e colaboradores), variante `es_MX`, da pasta `es` de
  <https://github.com/LibreOffice/dictionaries>. Licença tripla à escolha: **GPLv3**, **LGPLv3** ou
  **MPL 1.1**. Não é versionado: baixe `es_MX.dic` e `es_MX.aff` (fora do projeto) e rode
  `node scripts/build-dictionary.mjs --lang es <es_MX.dic> <es_MX.aff>`.
- **Ñ:** é uma letra própria. Os acentos saem (Á vira A, Ü vira U), mas o Ñ fica, nos scripts
  (`strip` em `scripts/lib/lang.mjs`) e no app (`normalize` em `src/game/engine/grid.ts`). O gerador
  indexa 27 letras (A–Z e Ñ).
- **Temas:** `animales`, `alimentos`, `naturaleza`, `hogar`, `deportes`, `oficios`, `cuerpo`, `escuela`
  (a arte é a mesma dos outros idiomas). Os ids não podem repetir os do português (`comida`, `casa`):
  o progresso do Casual é guardado pelo id da grade.

```sh
node scripts/check-clues.mjs --lang es
node scripts/catalogo.mjs --lang es --add novas.txt     # linhas PALABRA|pista|nivel|tipo|dica
node scripts/catalogo.mjs --lang es --resumo
```
