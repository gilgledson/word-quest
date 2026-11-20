# Arte WordQuest — referência aprovada

Gerada com a ferramenta integrada image_gen, usando a imagem aprovada pelo autor como referência. Arquivos locais em public/art, sem dependência do diretório de geração.

## Prompt set

1. Cenário (precise-object-edit): reconstruir somente a paisagem vertical 9:16 da referência aprovada. Preservar estilo de pintura 2D casual, céu azul, vila com telhados alaranjados à esquerda, ponte de pedra, riacho turquesa, montanhas e castelo ao fundo, placa de madeira à direita, vegetação e caminho de pedras. Remover e recompor todas as áreas cobertas por interface, textos, cartões, botões e navegação. Sem textos ou interface na imagem.
2. Ícones (stylized-concept): recriar em fundo transparente os ícones ilustrados da referência, em quatro células iguais: livro em botão azul, calendário com estrela, mapa com marcador vermelho e baú dourado. Preservar brilho, volume e perspectiva. Sem letras ou interface adicional. O resultado possui proporção total 3:1, consumido por CSS em quatro células de proporção 3:4.
3. Logo (logo-brand): recriar somente WordQuest e faixa de pergaminho com A JORNADA DAS PALAVRAS em fundo transparente. Word branco/azul-claro, Quest dourado, contorno azul-marinho, sombras e letras arredondadas. Sem ícone de livro, paisagem ou outros elementos.

## Integração

- village-approved-v1.webp: cenário da Home, miniatura do mundo e mapa.
- game-icons-v1.webp: sprites de livro, calendário, mapa e baú.
- wordquest-logo-v1.webp: marca no cabeçalho.

As imagens foram inspecionadas individualmente. Não se trata de reprodução pixel a pixel do mockup completo: textos dinâmicos, cartões e controles continuam componentes HTML responsivos. A campanha disponível continua com 3 fases reais, por isso o indicador não usa o 0/30 ilustrativo do mockup.

## map-straight-v1.jpg (mapa de fases)

Ilustração 3D isométrica do cenário do mapa, gerada no Leonardo.ai (modelo Nano Banana Pro, 2:3, 848×1264, modo privado) com este prompt: "Vertical level-map background for a mobile word-puzzle game, stylized glossy 3D cartoon render like a Candy Crush world map. Bird's-eye isometric view looking straight down at a charming fantasy word village: the ENTIRE frame is ground and scenery … One wide perfectly STRAIGHT vertical cream-and-golden cobblestone road runs from the exact bottom edge to the exact top edge, centered horizontally, about one quarter of the image width … On both sides, mirrored and balanced: cottages, trees, flower beds, a small stone bridge over a stream, signposts, lanterns, giant open-book props, floating golden letter blocks … No text, no UI, no characters." (substituiu a versão com caminho em S).

O mapa mostra a imagem uma vez, cobrindo a tela (cover, centralizada). O caminho é reto no centro: `src/data/map-road.json` guarda x = 0,5 em toda a altura. As fases ficam sobre essa linha, distribuídas do pé da tela até o portão do próximo mundo. Se trocar a imagem, refaça esse arquivo.

## tabuleiros/ (ícones dos tamanhos do duelo ao vivo)

`6x6.webp`, `6x7.webp`, `7x7.webp` e `8x8.webp`: ícones dos cartões "Tamanho do tabuleiro" na tela Configurar partida. Gerados no ChatGPT numa folha única com fundo transparente (`docs/referencias/icones-tabuleiro-chatgpt.png`), a partir da referência da tela (`docs/referencias/duelo-tamanho-chatgpt.png`): tabuleiro 3D com moldura dourada, casas brancas e de pista verdes, e um selo do ritmo (raio, pena, relógio, ampulheta). O `6x7` veio depois, sozinho (`docs/referencias/icone-6x7-chatgpt.png`), reduzido para a mesma escala de casa dos outros. Recortados com `cwebp` na mesma altura (150 px) e alinhados pela base, para manter a escala entre eles.

## resultado/ (faixas do título no fim da partida)

`faixa-vitoria.webp` (dourada, com coroa e estrelas), `faixa-derrota.webp` (azul-prateada) e `faixa-empate.webp` (bronze): fundo da faixa do título no cartão de resultado (`src/features/puzzle/ResultSheet.tsx`). Geradas no ChatGPT numa folha única, sem texto e com fundo transparente (`docs/referencias/faixas-titulo-chatgpt.png`), a partir da referência da tela (`docs/referencias/fim-partida-chatgpt.png`); o texto ("Você venceu!", "Empate!", "Fulano venceu") é do app. Recortadas com `cwebp` em 640 px de largura; a de vitória inclui a coroa (mais alta).

`fita-jogador.webp` (fita azul, letras douradas) e `fita-rival.webp` (fita prateada, letras roxas), com "PALAVRA COMPLETA!": fita embaixo do "+N" quando uma palavra fecha (`src/features/puzzle/ScoreFloats.tsx`); o número é do app. Fita da opção B das propostas do ChatGPT (`docs/referencias/banner-pontos-opcoes-chatgpt.png`), gerada isolada com fundo transparente (`docs/referencias/fita-pontos-chatgpt.png`), recortada pelo contorno e convertida com `cwebp -q 85 -alpha_q 100` (400 px).

`numeros/{mais,0-9}.webp`: algarismos 3D dourados (contorno azul-marinho) com que o app monta o "+N" em cima da fita (`Number3D` em `src/features/puzzle/ScoreFloats.tsx`). Gerados no ChatGPT numa folha transparente (`docs/referencias/numeros-3d-chatgpt.png`), cortados um a um com a altura da linha (mesma base), 160 px de altura, `cwebp -q 85 -alpha_q 100`.

`moldura-vencedor.webp`: moldura do avatar de quem venceu no cartão de resultado (aro dourado com louros, coroa com pedra vermelha, raios e estrelinhas; centro e fundo transparentes). Gerada no ChatGPT (`docs/referencias/moldura-vencedor-chatgpt.png`) e reduzida para 360 px com `cwebp`; no app ela tem 168% do tamanho do avatar, com o furo central rente à borda dele.

`opponents/{cientista,pirata,astronauta,coelhinha,latina,skatista,detetive,cavaleiro,latino}-<humor>.webp`: avatares do jogador (`src/game/avatars.ts`), seis humores cada (neutral, happy, sad, angry, surprised, thinking). Gerados no ChatGPT numa folha 3×2 por personagem, no estilo dos avatares existentes (`docs/referencias/avatares/<id>-chatgpt.png`), e cortados em 256 px com `cwebp -q 82`.

`duelo/vs.webp`: escudo dourado "VS" com espadas cruzadas do card "Desafie seu amigo" da tela inicial (`src/features/DuelCard.tsx`). Gerado no ChatGPT com fundo transparente a partir do mockup `docs/referencias/home-desafie-amigo-chatgpt.png`, cortado no contorno e reduzido a 320 px (`cwebp -q 85 -alpha_q 100`).

`mundos/{vila,floresta,deserto,reino,ilhas}.webp`: cena de cada mundo no card da tela inicial (`src/features/WorldCard.tsx`); a da Vila é outra composição, para não repetir o fundo (`village-approved-v1.webp`). Geradas no ChatGPT no estilo e enquadramento da Vila (`docs/referencias/mundos/<id>-chatgpt.png`), 720 px de largura, `cwebp -q 80`.

`temas/{animes,esportes,profissoes,corpo,escola}.webp`: arte dos temas novos do Casual e do duelo, geradas no ChatGPT no estilo das quatro primeiras (`docs/referencias/temas/<id>-chatgpt.png`), 512×512, `cwebp -q 82`. A de Animes não usa personagens nem elementos de obras existentes.
