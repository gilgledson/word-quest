# Arte WordQuest — referência aprovada

Gerada com a ferramenta integrada image_gen, usando a imagem aprovada pelo autor como referência. Arquivos locais em public/art, sem dependência do diretório de geração.

## Prompt set

1. Cenário (precise-object-edit): reconstruir somente a paisagem vertical 9:16 da referência aprovada. Preservar estilo de pintura 2D casual, céu azul, vila com telhados alaranjados à esquerda, ponte de pedra, riacho turquesa, montanhas e castelo ao fundo, placa de madeira à direita, vegetação e caminho de pedras. Remover e recompor todas as áreas cobertas por interface, textos, cartões, botões e navegação. Sem textos ou interface na imagem.
2. Ícones (stylized-concept): recriar em fundo transparente os ícones ilustrados da referência, em quatro células iguais: livro em botão azul, calendário com estrela, mapa com marcador vermelho e baú dourado. Preservar brilho, volume e perspectiva. Sem letras ou interface adicional. O resultado possui proporção total 3:1, consumido por CSS em quatro células de proporção 3:4.
3. Logo (logo-brand): recriar somente WordQuest e faixa de pergaminho com A JORNADA DAS PALAVRAS em fundo transparente. Word branco/azul-claro, Quest dourado, contorno azul-marinho, sombras e letras arredondadas. Sem ícone de livro, paisagem ou outros elementos.

## Integração

- village-approved-v1.png: cenário da Home, miniatura do mundo e mapa.
- game-icons-v1.png: sprites de livro, calendário, mapa e baú.
- wordquest-logo-v1.png: marca no cabeçalho.

As imagens foram inspecionadas individualmente. Não se trata de reprodução pixel a pixel do mockup completo: textos dinâmicos, cartões e controles continuam componentes HTML responsivos. A campanha disponível continua com 3 fases reais, por isso o indicador não usa o 0/30 ilustrativo do mockup.

## map-straight-v1.jpg (mapa de fases)

Ilustração 3D isométrica do cenário do mapa, gerada no Leonardo.ai (modelo Nano Banana Pro, 2:3, 848×1264, modo privado) com este prompt: "Vertical level-map background for a mobile word-puzzle game, stylized glossy 3D cartoon render like a Candy Crush world map. Bird's-eye isometric view looking straight down at a charming fantasy word village: the ENTIRE frame is ground and scenery … One wide perfectly STRAIGHT vertical cream-and-golden cobblestone road runs from the exact bottom edge to the exact top edge, centered horizontally, about one quarter of the image width … On both sides, mirrored and balanced: cottages, trees, flower beds, a small stone bridge over a stream, signposts, lanterns, giant open-book props, floating golden letter blocks … No text, no UI, no characters." (substituiu a versão com caminho em S).

O mapa mostra a imagem uma vez, cobrindo a tela (cover, centralizada). O caminho é reto no centro: `src/data/map-road.json` guarda x = 0,5 em toda a altura. As fases ficam sobre essa linha, distribuídas do pé da tela até o portão do próximo mundo. Se trocar a imagem, refaça esse arquivo.
