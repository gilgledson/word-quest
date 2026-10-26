# WordQuest — A Jornada das Palavras

Jogo Arrowword em português, React + TypeScript strict + Vite. Jogo de confronto: 25 fases densas 8×10, aventura, mapa, perfil, desafio diário local, moedas, ajudas e persistência IndexedDB. **Toda partida é um duelo contra um oponente programado**; vence quem pontuar mais.

## Executar

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

## Organização

- `src/game/crossword-engine.ts`: domínio sem React (validação, matriz por coordenadas, inventário de peças `RackManager`, confirmação ✓, pontuação e recompensas).
- `src/game/opponent.ts`: bot local do modo duelo (TypeScript puro, sem IA generativa nem rede).
- `src/data/levels.json`: fases geradas e verificadas nos testes (ver `scripts/README.md`).
- `scripts/`: gerador das grades densas, catálogo de pistas e verificadores. Fora do app; ver `scripts/README.md` (inclui a licença do vocabulário VERO).
- `src/services/repository.ts`: contrato de repositório e adaptador Dexie; ponto de substituição por API.
- `src/stores/player.ts`: hidratação e fila de salvamentos automáticos.
- `src/features/`: telas e interação. `src/hooks/`: arrastar letras e dimensionamento da grade.
- `src/components/Scenery.tsx` e `public/art/`: arte ilustrada baseada na referência aprovada.

## Como jogar

A grade é sempre **8 colunas × 10 linhas**, sem rolagem e sem zoom: o tamanho da célula é calculado pelo espaço disponível. É densa, com pistas na borda e dentro da grade; uma célula de pista pode ter duas pistas (→ em cima, ↓ embaixo). Toque numa pista (ou numa casa) para escolher a palavra.

As letras ficam no **banco**: sempre **5 peças**, sorteadas entre as letras que ainda faltam. As peças que você usa só são repostas ao **concluir o turno (✓)**. Toque numa peça (ela vai para a próxima casa vazia da palavra selecionada) ou **arraste-a para qualquer casa ainda não confirmada**: a palavra daquela casa é selecionada automaticamente e, se já havia ali uma letra pendente, ela é substituída e volta ao banco. A letra fica **pendente**. Toque numa peça pendente para devolvê-la ao banco, ou arraste-a para outra casa ainda não confirmada. **✓ Confirmar** trava as letras certas (+1 ponto cada letra nova). **Fechar uma palavra vale a palavra inteira**: quem coloca a última letra, mesmo que seja só uma, recebe 1 ponto por letra da palavra, inclusive as que já estavam lá (suas ou do oponente, que mantém o que já tinha); palavra de 5 letras fechada com 1 letra rende 5 pontos e devolve as erradas ao banco: **cada letra confirmada no lugar errado custa 1 ponto** (o placar nunca fica abaixo de 0; aparece um "−1" sobre a casa). Nada é marcado de vermelho enquanto você joga: o erro só aparece ao confirmar. Revelar pela Dica não rende pontos. Ao pontuar, um "+N" sobe sobre as casas certas (com "Palavra! +3" quando fecha uma palavra), as casas brilham e o placar dá um pulo; o mesmo vale para as jogadas do oponente, em roxo. Cada palavra fechada na jogada vale o tamanho inteiro, inclusive duas palavras de uma vez ou uma letra de cruzamento que fecha as duas (a letra do cruzamento conta em cada uma). Palavras fechadas só pela Dica não pontuam. As animações respeitam a opção "Animações" do Perfil.

- **Trocar** (10 moedas por peça, até 5): troca peças do banco por outras letras úteis e diferentes.
- **Dica** (20 moedas): revela uma letra.

O banco só recebe letras da própria solução (uma peça por casa de resposta, cruzamentos contam uma vez). Se nenhuma peça serve, o banco é trocado de graça; uma letra necessária presa numa casa errada volta ao banco. Toda fase pode ser concluída sem gastar moedas. A primeira conclusão concede a recompensa e desbloqueia a próxima fase. O diário usa a data em America/Sao_Paulo e só recompensa uma vez por dia.

## Mapa de fases

A tela de fases **sobe**, sobre uma ilustração 3D isométrica (`public/art/map-straight-v1.jpg`, inspirada em mapas de jogos de fases): a fase 1 fica embaixo, em "Início da jornada", e um caminho reto sobe até o portão do próximo mundo (Floresta dos Enigmas, "Em breve"). As fases ficam sobre o caminho da própria ilustração (`src/data/map-road.json`). O trecho já percorrido brilha em dourado; a fase atual é maior, pulsa e tem "Você está aqui"; as vencidas ficam verdes com estrelas e as seguintes, bloqueadas. Há cinco mapas, um por mundo, cada um com cinco fases e arte própria gerada no Leonardo.ai com o mesmo prompt trocando o tema: Vila das Palavras (1–5, `/map`), Floresta dos Enigmas (6–10), Deserto dos Mistérios (11–15), Reino dos Sábios (16–20) e Ilhas do Conhecimento (21–25), em `/map/<mundo>` com arte `public/art/map-*-v1.jpg`. Vencer um mundo abre o portão do próximo, e o rótulo do início volta para o mundo anterior. Cada mapa é uma tela só: a ilustração cobre a tela inteira (cover), sem rolagem e sem barra de navegação; as fases são distribuídas ao longo do caminho visível.

## Efeitos sonoros

Os sons são sintetizados com WebAudio (`src/services/sound.ts`): sem arquivos de áudio, funcionam offline e no APK. Tocam ao colocar, substituir e devolver uma peça, ao confirmar (sobe um degrau por letra certa; arpejo quando a palavra fecha; tom grave quando nenhuma letra acerta), ao passar a vez, nas ajudas, na troca e compra de peças, em ações recusadas, nas jogadas do oponente e no resultado (vitória, empate, derrota). Vêm ligados por padrão; o Perfil liga e desliga e a escolha fica salva.

## Duelo contra o oponente

Não há fase solo: toda fase da aventura e o desafio do dia são duelos. A dificuldade do oponente (Fácil, Médio, Difícil) é escolhida no **Perfil**. Os turnos se alternam sem cronômetro: você coloca letras e toca em **✓** (sem peças pendentes, **Passar a vez**); depois o oponente joga. Os dois usam o mesmo tabuleiro e o mesmo inventário de letras. **Vence quem somar mais pontos quando a grade fechar.** Vencer conclui a fase e libera a próxima (1, 2 ou 3 estrelas conforme a dificuldade); empate ou derrota permitem jogar de novo. A recompensa do duelo (vitória 50, empate 25, derrota 10 moedas) é paga uma única vez por fase e nível; no desafio do dia só a vitória rende (70 moedas, uma vez por dia). Abrir uma fase sem dificuldade na URL redireciona para o nível do perfil.

O oponente também tem **5 peças na mão**, sorteadas entre as letras que ainda faltam, e só joga com elas: depois de cada turno a mão volta a 5, e sem nenhuma peça útil ele troca a mão e passa a vez. Ele escolhe a palavra só pelo que o tabuleiro mostra (casas já travadas e tamanho). Para cada palavra que tenta, a chance base de "resolver" é 35% / 50% / 70%, ajustada pelas letras reveladas e pelo tamanho. Por turno ele tenta até 3 / 6 / 12 palavras, em ordem de atração, e coloca no máximo 2 / 4 / 5 letras (as que a mão permitir); se nenhuma tentativa render, passa a vez. Não usa moedas nem dicas. A seed e o contador do sorteio ficam salvos na sessão: recarregar a página repete a mesma jogada.

## Escopo e próximas etapas

**Modo casual** (menu "Casual", rota `/casual`): escolha um tema (Animais, Comida, Natureza, Casa e objetos) e jogue um duelo contra o oponente numa grade do tema. São 6 grades por tema, pré-geradas por `scripts/generate-casual.mjs` (palavras do tema em `scripts/data/themes.json`); não há estrelas nem desbloqueio, só as moedas do duelo na primeira vitória de cada grade. Cada grade tem de 4 a 9 respostas do tema; o resto vem do vocabulário geral, porque a grade densa 8×10 não fecha só com palavras de um tema.

As 25 fases estão em cinco mundos de cinco fases; mundos além das Ilhas do Conhecimento **ainda não existem** (o portão do último mapa diz "Novos mundos · Em breve"). Todas as fases usam o vocabulário fácil, então a dificuldade não cresce de um mundo para o outro: faltam pistas médias e difíceis curtas para isso. O catálogo diário inicial reutiliza deterministicamente as 25 grades disponíveis; conteúdo diário exclusivo é uma expansão pendente. As pistas ilustradas (`icon`) já são aceitas pelo motor, mas ainda não há arte para elas. Não há autenticação nem servidor. Dados, data e economia locais podem ser manipulados; a futura API deverá validar resultados e fornecer a data oficial.

**Música de fundo:** a faixa "Where the River Bends" (`public/audio/where-the-river-bends.mp3`, 3 min, em loop, volume baixo) toca nas telas fora das partidas (no tabuleiro fica em silêncio) enquanto o app está visível e pausa ao sair. Liga e desliga pelo ícone de som no topo ou em Perfil → Música; o som só começa depois do primeiro toque (regra do navegador e do Android). No PWA o arquivo (4,3 MB) não entra no cache offline.

**Animações da partida** (`src/animations/`, CSS em `animations.css`): um sistema orientado a eventos. `useGameAnimations` compara a sessão anterior com a atual e emite um evento por transição real (`LETTER_PLACED`, `LETTER_CONFIRMED`, `WORD_COMPLETED` por `wordId`, `HINT_REVEALED`, `TURN_CHANGED`...), com id `sessionKey#revisão:tipo:alvo` (a revisão é um contador da camada visual; nada é gravado no motor). A primeira sessão vista (abrir, restaurar, recarregar) é só linha de base, então nada antigo é reproduzido; recompensas continuam protegidas por `claimed` no estado persistido. `AnimationQueue` ignora ids repetidos, escalona (180 ms) contornos de palavras fechadas juntas e limpa seus timers. Efeitos: contorno luminoso animado da palavra concluída (SVG, azul do jogador, roxo do oponente, versão discreta quando só a Dica fecha; posições vêm das casas reais, também com o tabuleiro girado), encaixe elástico da letra, varredura de seleção, anel do ✓, letra rejeitada que treme e volta ao banco, estrela da Dica, saída das peças trocadas e pontinhos do oponente pensando. O arrasto move o fantasma e marca o destino direto no DOM (sem renderizar a grade a cada movimento) e limpa o destaque ao soltar, cancelar ou desmontar. Durações e cores ficam em `animation.config.ts`; as animações respeitam a opção Animações do Perfil e `prefers-reduced-motion`, e os overlays nunca capturam toque nem bloqueiam o jogo.

**Recompensas, conclusão e transições** (Etapa 2 das animações): `COINS_EARNED` nasce do aumento do saldo na transição em que a partida passa a `claimed`; 7 moedas voam do painel de resultado até o contador do cabeçalho, o saldo pulsa e aparece "+N" (o crédito é do estado do jogo; remontar a tela não repete nada nem credita de novo). A conclusão da fase mostra o selo "Fase concluída!", as estrelas em sequência, uma onda luminosa no tabuleiro (vitória e empate; derrota sem efeito) e o confete já existente (só vitória); o botão de continuar funciona desde o primeiro instante. `motion.main` no `Layout` faz um fade curto (≤180 ms) entre telas (sem movimento no mapa em tela cheia nem com Animações desligadas) e o modal de trocar letras abre com fade e escala.

**Janela de resultado** (`src/features/ResultPopup.tsx`): ao terminar um duelo abre uma janela com o resultado (Vitória!, Empate ou Derrota), o placar final, as moedas pagas e, na campanha, a próxima fase; fecha por botão, Esc ou toque fora e o painel de resultado continua por trás. Só aparece quando a partida termina naquele momento (reabrir uma partida já terminada não abre), fica abaixo da camada de efeitos para as moedas voarem por cima e não depende de animação para funcionar.

**Oponentes fixos por fase, com expressões** (`src/game/opponents.ts`; rostos em `public/art/opponents/<id>-<humor>.png`, uma folha por personagem gerada no Leonardo.ai e cortada em seis humores: neutral, thinking, happy, angry, sad, surprised): o jogador não escolhe oponente. Cada fase da campanha tem o seu (`OPPONENT_BY_LEVEL`) e a 5ª de cada mundo é um **chefe**; o modo casual sorteia um por partida e o Desafio do Dia usa um por data. São 11 personagens: Bolota (esquilo) e Fagulha (dragãozinho) no nível fácil; Sabi (coruja) e Raposo (raposa) no médio; Oráculo (lince) e Draco (dragão) no difícil; e os chefes Mestre Cuco (Vila), Musgo (Floresta), Esfinge Zefa (Deserto), Rainha Lúmen (Reino) e Capitão Polvo (Ilhas). O **nível** define a força geral (`OPPONENT_LEVELS`) e o **estilo** o jeito de jogar (`OPPONENT_STYLES`): o cuidadoso prefere palavras curtas e quase prontas, acerta mais e põe menos letras por turno; o agressivo mira palavras longas, erra mais e põe mais letras quando acerta. A dificuldade média dos oponentes sobe de mundo em mundo (testado). O personagem fica gravado na sessão (`versus.opponent`/`style`); o parâmetro `vs` da URL (que o app não gera) força um oponente ou nível, só para testes. **Humor animado** (`useOpponentMood`, `OpponentPortrait`): o rosto reage às transições reais da partida, comparando a sessão anterior com a atual: feliz quando ele pontua, com raiva quando você fecha uma palavra na frente ou quando ele passa a vez sem nada, surpreso quando você fecha uma palavra com ele na frente, pensando na vez dele; no fim, feliz se vence, triste se perde, surpreso no empate. Cada humor tem animação própria (pulo, tremor, queda, susto, balanço) e um balãozinho, só com `transform`/`opacity`, desligados com Animações off e `prefers-reduced-motion`; se a arte de um humor faltar, volta ao neutro. O nome curto aparece no placar e a janela de resultado traz a fala do oponente. O Perfil tem a galeria "Seus rivais". **Topo da partida** (`VersusPanel`): painel dourado com os dois duelistas lado a lado, o explorador (anel azul, arte `public/art/opponents/jogador-<humor>.png`) e o oponente (anel roxo), cada um com faixa de placar em escudo e nome, o selo VS no centro e a seta "sua vez"/"vez dele"; o anel de quem joga brilha. O rosto do jogador também reage (feliz ao pontuar, bravo quando o oponente fecha uma palavra, surpreso com a jogada dele, triste ao perder ponto) pelo mesmo `useOpponentMood` com `who: "p"`. **Avatares do jogador** (`src/game/avatars.ts`): cinco à escolha na galeria "Seu avatar" do Perfil (Explorador, Aventureira, Caçador, Gatinho e Panda), cada um com os seis humores em `public/art/opponents/<id>-<humor>.png` (folhas geradas no Leonardo.ai); a escolha fica em `player.avatar` e vale na partida.

**Vibração e confete:** cada efeito sonoro tem uma vibração parceira (`src/services/haptics.ts`, plugin `@capacitor/haptics`; leve ao mexer nas peças, firme ao acertar, notificação ao fechar palavra, vencer ou errar). Liga e desliga em Perfil → Vibração. Ao vencer um duelo solta confete (`canvas-confetti`, carregado só na primeira vitória; respeita Animações e o "reduzir movimento" do sistema).

PWA: o build gera service worker para cache da aplicação, fontes e ilustração locais. Funcionamento offline após o primeiro carregamento servido via HTTPS ou localhost. Ícone SVG provisório; ícones PNG e validação de instalação em aparelhos físicos ainda pendentes.

As fases podem ser revisitadas; recompensas da campanha não são pagas novamente. A preferência de movimento reduzido do sistema é respeitada. Limpar os dados do navegador remove o progresso. Sessões salvas antes do fluxo de confirmação (✓) são descartadas; estrelas e moedas permanecem.

## APK Android (Capacitor)

O jogo é empacotado com o Capacitor (`capacitor.config.ts`, pasta `android/`). Para gerar um APK de teste:

```sh
npm run build:android   # build em modo capacitor (sem service worker) + cap sync
cd android && ./gradlew assembleDebug   # saída: android/app/build/outputs/apk/debug/app-debug.apk
```

Requer JDK 21 e o Android SDK (API 36). No Windows, se o Gradle falhar com "Unable to establish loopback connection", defina `TEMP`/`TMP` e `-Djava.io.tmpdir` para um caminho curto (ex.: `C:\tmp`): nomes 8.3 como `GILGLE~1` quebram o socket local do Java. Aumente `versionCode`/`versionName` em `android/app/build.gradle` a cada APK novo (com o mesmo `versionCode` o Android pode não atualizar o app) e use `build:android`, não `build`: o build web normal registra um service worker que faria o WebView manter a versão antiga em cache. O APK debug usa a chave de debug; para publicar na Play Store será preciso um build `release` assinado.
