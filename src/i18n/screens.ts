/**
 * Textos das telas de menu e da moldura do app: tela inicial, mapa, casual, diário, perfil, loja,
 * créditos, abertura e avisos. Os nomes de mundos, temas e rivais vêm do conteúdo, não daqui.
 */
import { plural, texts } from "./index";

/** Moldura do app: topo, rodapé, navegação, carregamento e tela de erro. */
export const shellT = texts({
  pt: {
    logoAlt: "WordQuest — A Jornada das Palavras",
    walletShop: (coins: number) => `${coins} moedas: abrir a loja`,
    musicOff: "Desligar música",
    musicOn: "Ligar música",
    backToMenu: "Voltar ao menu principal",
    settings: "Configurações",
    footer1: "Uma palavra. Um novo caminho.",
    footer2: "Feito para explorar, no seu ritmo.",
    mainNav: "Navegação principal",
    navAdventure: "Aventura",
    navCasual: "Casual",
    navDaily: "Diário",
    navProfile: "Perfil",
    toClaim: (n: number) =>
      `${n} ${plural(n, "conquista", "conquistas")} para resgatar`,
    openingLevel: "Abrindo a fase…",
    openingDuel: "Abrindo o duelo…",
    preparing: "Preparando sua aventura…",
    splash: "Abrindo WordQuest, um jogo da Lunara Games",
    scenery:
      "Vila de fantasia com casas de telhado alaranjado, ponte de pedra, riacho e montanhas",
    errorTitle: "Ops, algo deu errado",
    errorText: "Seu progresso está salvo neste dispositivo. Tente de novo.",
    errorRetry: "Tentar de novo",
    errorHome: "Voltar ao início",
  },
  en: {
    logoAlt: "WordQuest — The Word Journey",
    walletShop: (coins: number) => `${coins} coins: open the shop`,
    musicOff: "Turn music off",
    musicOn: "Turn music on",
    backToMenu: "Back to main menu",
    settings: "Settings",
    footer1: "One word. A new path.",
    footer2: "Made for exploring, at your own pace.",
    mainNav: "Main navigation",
    navAdventure: "Adventure",
    navCasual: "Casual",
    navDaily: "Daily",
    navProfile: "Profile",
    toClaim: (n: number) =>
      `${n} ${plural(n, "achievement", "achievements")} to claim`,
    openingLevel: "Opening the level…",
    openingDuel: "Opening the duel…",
    preparing: "Getting your adventure ready…",
    splash: "Opening WordQuest, a Lunara Games game",
    scenery:
      "Fantasy village with orange-roofed houses, a stone bridge, a stream and mountains",
    errorTitle: "Oops, something went wrong",
    errorText: "Your progress is saved on this device. Try again.",
    errorRetry: "Try again",
    errorHome: "Back to home",
  },
});

/** Faixa da versão web (baixar o app / pôr na Tela de Início). */
export const webBarT = texts({
  pt: {
    label: "WordQuest no celular",
    androidTitle: "Baixe o app grátis",
    androidText: "Seu progresso salvo e convites que abrem direto no jogo.",
    iosTitle: "Guarde o jogo na Tela de Início",
    iosText:
      "Toque em Compartilhar e depois em “Adicionar à Tela de Início” para não perder seu progresso.",
    close: "Fechar aviso",
  },
  en: {
    label: "WordQuest on your phone",
    androidTitle: "Get the free app",
    androidText:
      "Your progress saved, and invites that open right in the game.",
    iosTitle: "Add the game to your Home Screen",
    iosText:
      "Tap Share, then “Add to Home Screen” so you don't lose your progress.",
    close: "Dismiss",
  },
});

/** Tela inicial: card do mundo, baú, duelo e recompensa diária. */
export const homeT = texts({
  pt: {
    titleStart: "Sua aventura começa!",
    titleGoing: "Sua aventura continua!",
    // Card do mundo
    reviewMap: "Rever o mapa",
    resumeMatch: "Retomar partida",
    playFirst: "Jogar primeira fase",
    continueAdventure: "Continuar aventura",
    seeMap: (world: string) => `Ver o mapa: ${world}`,
    worldPill: (n: string) => `MUNDO ${n}`,
    stepOf: (i: number, n: number) => `Fase ${i} de ${n}`,
    adventureDone: "Aventura completa!",
    worldDone: "Mundo completo!",
    trail: "Fases do mundo",
    stepDone: "concluída",
    stepCurrent: "a próxima",
    stepPending: "ainda não",
    step: (i: number, state: string) => `Fase ${i}: ${state}`,
    adventureTotal: (wins: number, total: number) =>
      `Aventura: ${wins}/${total} fases`,
    // Baú
    chestsReady: (n: number) => `${n} baús prontos!`,
    chestReady: "Baú pronto! Toque nele",
    chestIn: (n: number) => `Baú em ${n} ${plural(n, "palavra", "palavras")}`,
    openChest: (coins: number) => `Abrir baú: ${coins} moedas`,
    chestClosed: "Baú fechado: descubra mais palavras para abrir",
    chestOpened: "Baú aberto",
    continue: "Continuar",
    // Duelo
    duelLabel: "Desafie seu amigo: duelo online. Convidar",
    duelTitle: "Desafie seu amigo",
    duelSub: "Duelo online",
    duelInvite: "Convidar",
  },
  en: {
    titleStart: "Your adventure begins!",
    titleGoing: "Your adventure continues!",
    reviewMap: "View the map",
    resumeMatch: "Resume match",
    playFirst: "Play first level",
    continueAdventure: "Continue adventure",
    seeMap: (world: string) => `View the map: ${world}`,
    worldPill: (n: string) => `WORLD ${n}`,
    stepOf: (i: number, n: number) => `Level ${i} of ${n}`,
    adventureDone: "Adventure complete!",
    worldDone: "World complete!",
    trail: "World levels",
    stepDone: "done",
    stepCurrent: "up next",
    stepPending: "not yet",
    step: (i: number, state: string) => `Level ${i}: ${state}`,
    adventureTotal: (wins: number, total: number) =>
      `Adventure: ${wins}/${total} levels`,
    chestsReady: (n: number) => `${n} chests ready!`,
    chestReady: "Chest ready! Tap it",
    chestIn: (n: number) => `Chest in ${n} ${plural(n, "word", "words")}`,
    openChest: (coins: number) => `Open chest: ${coins} coins`,
    chestClosed: "Chest locked: find more words to open it",
    chestOpened: "Chest opened",
    continue: "Continue",
    duelLabel: "Challenge a friend: live duel. Invite",
    duelTitle: "Challenge a friend",
    duelSub: "Live duel",
    duelInvite: "Invite",
  },
});

/** Janela da recompensa diária e convite para o lembrete. */
export const dailyRewardT = texts({
  pt: {
    title: "Recompensa diária",
    sub: "Volte todo dia e ganhe mais moedas",
    dayLabel: (day: number, coins: number, state: "got" | "today" | "locked") =>
      `Dia ${day}: ${coins} moedas${
        state === "got" ? ", já pego" : state === "today" ? ", hoje" : ""
      }`,
    day: (day: number) => `Dia ${day}`,
    claim: (coins: number) => `Pegar +${coins} moedas`,
    tomorrow: (coins: number) => `Amanhã: +${coins} moedas`,
    reminderLabel: "Lembrete diário",
    reminderTitle: "Quer um lembrete?",
    reminderText:
      "Avisamos uma vez por dia, no fim da tarde, quando o desafio do dia chegar e sua recompensa estiver pronta.",
    reminderYes: "Sim, me avise",
    reminderNo: "Agora não",
  },
  en: {
    title: "Daily reward",
    sub: "Come back every day for more coins",
    dayLabel: (day: number, coins: number, state: "got" | "today" | "locked") =>
      `Day ${day}: ${coins} coins${
        state === "got" ? ", claimed" : state === "today" ? ", today" : ""
      }`,
    day: (day: number) => `Day ${day}`,
    claim: (coins: number) => `Claim +${coins} coins`,
    tomorrow: (coins: number) => `Tomorrow: +${coins} coins`,
    reminderLabel: "Daily reminder",
    reminderTitle: "Want a reminder?",
    reminderText:
      "We'll let you know once a day, late in the afternoon, when the daily challenge is in and your reward is ready.",
    reminderYes: "Yes, remind me",
    reminderNo: "Not now",
  },
});

/** Mapa de um mundo (campanha). */
export const campaignT = texts({
  pt: {
    enter: "Entrar",
    newWorlds: "Novos mundos",
    remaining: (n: number, stars: number, max: number) =>
      `Faltam ${n} ${plural(n, "fase", "fases")} · ★ ${stars}/${max}`,
    soon: "Em breve",
    level: (
      n: number,
      boss: string | undefined,
      stars: number,
      unlocked: boolean,
    ) =>
      `Fase ${n}${boss !== undefined ? `, chefe ${boss}` : ""}${stars ? `, ${stars} estrelas` : unlocked ? ", disponível" : ", bloqueada"}`,
    bossTag: (name: string | undefined) => `Chefe: ${name}`,
    here: "Você está aqui",
    boss: "Chefe",
    locked: "Bloqueada",
  },
  en: {
    enter: "Enter",
    newWorlds: "New worlds",
    remaining: (n: number, stars: number, max: number) =>
      `${n} ${plural(n, "level", "levels")} left · ★ ${stars}/${max}`,
    soon: "Coming soon",
    level: (
      n: number,
      boss: string | undefined,
      stars: number,
      unlocked: boolean,
    ) =>
      `Level ${n}${boss !== undefined ? `, boss ${boss}` : ""}${stars ? `, ${stars} ${plural(stars, "star", "stars")}` : unlocked ? ", available" : ", locked"}`,
    bossTag: (name: string | undefined) => `Boss: ${name}`,
    here: "You're here",
    boss: "Boss",
    locked: "Locked",
  },
});

/** Modo casual: escolha do tema e configuração da partida. */
export const casualT = texts({
  pt: {
    eyebrow: "MODO CASUAL",
    title: "Escolha um tema",
    sub: "Um duelo rápido numa cruzadinha cheia de palavras do tema.",
    themes: "Temas",
    won: (done: number, total: number) => `${done} de ${total} grades vencidas`,
    progress: (theme: string) => `Progresso em ${theme}`,
    playTheme: (theme: string) => `Jogar tema ${theme}`,
    play: "Jogar",
    playFriend: "Jogar com um amigo",
    // Configuração
    setupTitle: "Configurar partida",
    you: "Você",
    random: "Sorteio",
    theme: "Tema:",
    surprise: "Surpresa",
    change: "trocar",
    rival: "Adversário",
    randomLabel: "Sorteio: um adversário qualquer",
    any: "Qualquer",
    against: (name: string) => `Partida contra ${name}, sem aposta.`,
    randomHint: "O adversário é sorteado ao começar. Sem aposta.",
    start: "Começar partida",
  },
  en: {
    eyebrow: "CASUAL MODE",
    title: "Pick a theme",
    sub: "A quick duel on a crossword full of words from the theme.",
    themes: "Themes",
    won: (done: number, total: number) => `${done} of ${total} boards won`,
    progress: (theme: string) => `Progress in ${theme}`,
    playTheme: (theme: string) => `Play theme ${theme}`,
    play: "Play",
    playFriend: "Play with a friend",
    setupTitle: "Set up match",
    you: "You",
    random: "Random",
    theme: "Theme:",
    surprise: "Surprise",
    change: "change",
    rival: "Rival",
    randomLabel: "Random: any rival",
    any: "Any",
    against: (name: string) => `Match against ${name}, no bet.`,
    randomHint: "Your rival is picked at random when you start. No bet.",
    start: "Start match",
  },
});

/** Desafio do dia: calendário e sequência. */
export const dailyT = texts({
  pt: {
    eyebrow: "UM PEQUENO RITUAL DE DESCOBERTAS",
    title: "Desafio do Dia",
    sub: "Volte a cada dia para um novo caminho.",
    streak: (n: number) => `${n} dias seguidos`,
    completed: (n: number) =>
      `${n} ${plural(n, "desafio concluído", "desafios concluídos")}`,
    wonToday: "Vencido hoje ✓",
    prize: (coins: number) => `+${coins} ao vencer`,
    weekdays: ["D", "S", "T", "Q", "Q", "S", "S"],
    day: (n: number, state: string) => `Dia ${n}: ${state}`,
    dayDone: "concluído",
    dayToday: "disponível hoje",
    dayFuture: "ainda indisponível",
    dayMissed: "não vencido",
    legendWon: "vencido",
    legendToday: "hoje",
    legendMissed: "não vencido",
    legendSoon: "em breve",
    revisit: "Revisitar desafio",
    playToday: "Jogar o desafio de hoje",
  },
  en: {
    eyebrow: "A LITTLE RITUAL OF DISCOVERY",
    title: "Daily challenge",
    sub: "Come back each day for a new path.",
    streak: (n: number) => `${n} days in a row`,
    completed: (n: number) =>
      `${n} ${plural(n, "challenge completed", "challenges completed")}`,
    wonToday: "Won today ✓",
    prize: (coins: number) => `+${coins} for a win`,
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
    day: (n: number, state: string) => `Day ${n}: ${state}`,
    dayDone: "completed",
    dayToday: "available today",
    dayFuture: "not available yet",
    dayMissed: "not won",
    legendWon: "won",
    legendToday: "today",
    legendMissed: "not won",
    legendSoon: "coming soon",
    revisit: "Revisit challenge",
    playToday: "Play today's challenge",
  },
});

/** Perfil: topo, abas, edição, rivais, ajustes, progresso e conquistas. */
export const profileT = texts({
  pt: {
    you: "Você",
    editAvatar: "Editar avatar e nome",
    eyebrow: "SEU PERFIL",
    defaultName: "Explorador",
    summary: (done: number, total: number, stars: number, coins: number) =>
      `${done} de ${total} fases · ${stars} estrelas · ${coins} moedas`,
    tabs: {
      resumo: "Resumo",
      conquistas: "Conquistas",
      rivais: "Rivais",
      ajustes: "Ajustes",
    },
    tabList: "Seções do perfil",
    ready: (n: number) => `${n} prontas`,
    tabPanel: (label: string) => `Aba ${label}`,
    // Edição
    editTitle: "Editar perfil",
    yourAvatar: "Seu avatar",
    avatars: "Avatares",
    nameLabel: "Nome do explorador",
    done: "Concluir",
    // Rivais
    rivals: "Rivais",
    bossPrefix: "Chefe · ",
    // Ajustes
    settings: "Ajustes",
    sound: "Efeitos sonoros",
    music: "Música",
    vibration: "Vibração",
    animations: "Animações",
    contrast: "Alto contraste na grade",
    reminder: "Lembrete diário (18h30)",
    timer: "Relógio do turno (25 s)",
    testSound: "Testar som",
    replayTutorial: "Rever o tutorial",
    tutorialOn: "Tutorial ativo",
    rate: "Avaliar o jogo",
    credits: "Créditos e licenças",
    language: "Idioma / Language",
    // Progresso
    progress: "Seu progresso",
    adventure: "Aventura",
    levels: "Fases",
    stars: "Estrelas",
    dailies: "Desafios do dia",
    duels: "Duelos",
    wins: "Vitórias",
    draws: "Empates",
    losses: "Derrotas",
    // Conquistas
    claimed: (n: number, total: number) => `${n}/${total} resgatadas`,
    claimAllLabel: (coins: number, n: number) =>
      `Resgatar tudo: ${coins} moedas de ${n} conquistas`,
    claimAll: "Resgatar tudo",
    achievements: "Conquistas",
    achievementProgress: (title: string) => `Progresso de ${title}`,
    claimedOne: "Resgatada ✓",
    claimLabel: (coins: number, title: string) =>
      `Resgatar ${coins} moedas de ${title}`,
    claim: "Resgatar",
    prizeLabel: (coins: number) => `Prêmio: ${coins} moedas`,
    coins: (coins: number) => `${coins} moedas`,
  },
  en: {
    you: "You",
    editAvatar: "Edit avatar and name",
    eyebrow: "YOUR PROFILE",
    defaultName: "Explorer",
    summary: (done: number, total: number, stars: number, coins: number) =>
      `${done} of ${total} levels · ${stars} ${plural(stars, "star", "stars")} · ${coins} ${plural(coins, "coin", "coins")}`,
    tabs: {
      resumo: "Overview",
      conquistas: "Awards",
      rivais: "Rivals",
      ajustes: "Settings",
    },
    tabList: "Profile sections",
    ready: (n: number) => `${n} ready`,
    tabPanel: (label: string) => `${label} tab`,
    editTitle: "Edit profile",
    yourAvatar: "Your avatar",
    avatars: "Avatars",
    nameLabel: "Explorer name",
    done: "Done",
    rivals: "Rivals",
    bossPrefix: "Boss · ",
    settings: "Settings",
    sound: "Sound effects",
    music: "Music",
    vibration: "Vibration",
    animations: "Animations",
    contrast: "High-contrast board",
    reminder: "Daily reminder (6:30 PM)",
    timer: "Turn timer (25 s)",
    testSound: "Test sound",
    replayTutorial: "Replay tutorial",
    tutorialOn: "Tutorial on",
    rate: "Rate the game",
    credits: "Credits and licenses",
    language: "Idioma / Language",
    progress: "Your progress",
    adventure: "Adventure",
    levels: "Levels",
    stars: "Stars",
    dailies: "Daily challenges",
    duels: "Duels",
    wins: "Wins",
    draws: "Draws",
    losses: "Losses",
    claimed: (n: number, total: number) => `${n}/${total} claimed`,
    claimAllLabel: (coins: number, n: number) =>
      `Claim all: ${coins} coins from ${n} achievements`,
    claimAll: "Claim all",
    achievements: "Achievements",
    achievementProgress: (title: string) => `Progress on ${title}`,
    claimedOne: "Claimed ✓",
    claimLabel: (coins: number, title: string) =>
      `Claim ${coins} coins from ${title}`,
    claim: "Claim",
    prizeLabel: (coins: number) => `Prize: ${coins} coins`,
    coins: (coins: number) => `${coins} ${plural(coins, "coin", "coins")}`,
  },
});

/** Cartão e aviso do Google Play Games. */
export const playGamesT = texts({
  pt: {
    saveDescription: (won: number, total: number) => `${won} de ${total} fases`,
    toast: "Conectado ao Google Play Games",
    toastAs: (name: string) => ` como ${name}`,
    connected: "Conectado",
    as: " como ",
    savedInAccount: "Seu progresso fica guardado na sua conta Google.",
    achievements: "Conquistas",
    leaderboard: "Placar",
    signedOut: (name: string) =>
      `Você saiu da conta ${name}. Entre de novo para guardar seu progresso na sua conta.`,
    signInText:
      "Entre com o Google Play Games para guardar seu progresso na sua conta e aparecer no placar.",
    signIn: "Entrar",
  },
  en: {
    saveDescription: (won: number, total: number) =>
      `${won} of ${total} levels`,
    toast: "Connected to Google Play Games",
    toastAs: (name: string) => ` as ${name}`,
    connected: "Connected",
    as: " as ",
    savedInAccount: "Your progress is saved to your Google account.",
    achievements: "Achievements",
    leaderboard: "Leaderboard",
    signedOut: (name: string) =>
      `You signed out of ${name}. Sign in again to save your progress to your account.`,
    signInText:
      "Sign in with Google Play Games to save your progress to your account and show up on the leaderboard.",
    signIn: "Sign in",
  },
});

/** Loja de itens. */
export const shopT = texts({
  pt: {
    bought: (item: string) =>
      `${item} comprado! Na partida, toque em Itens para usar.`,
    title: "Loja de itens",
    balance: "Seu saldo",
    coins: "moedas",
    forSale: "Itens à venda",
    usesPerBuy: (n: number) => `+${n} usos por compra`,
    youHave: (n: number) => `Você tem: ${n} ${plural(n, "uso", "usos")}`,
    buyLabel: (item: string, price: number) =>
      `Comprar ${item} por ${price} moedas`,
    buy: "Comprar",
    tipBefore: "Na partida, toque em ",
    tipItems: "Itens",
    tipAfter: " para usar!",
  },
  en: {
    bought: (item: string) =>
      `${item} bought! In a match, tap Items to use it.`,
    title: "Item shop",
    balance: "Your balance",
    coins: "coins",
    forSale: "Items for sale",
    usesPerBuy: (n: number) => `+${n} uses per purchase`,
    youHave: (n: number) => `You have: ${n} ${plural(n, "use", "uses")}`,
    buyLabel: (item: string, price: number) => `Buy ${item} for ${price} coins`,
    buy: "Buy",
    tipBefore: "In a match, tap ",
    tipItems: "Items",
    tipAfter: " to use them!",
  },
});

/** Créditos e licenças. */
export const creditsT = texts({
  pt: {
    eyebrow: "QUEM AJUDOU A FAZER ESTE JOGO",
    title: "Créditos e licenças",
    deck: "Créditos",
    back: "Voltar ao perfil",
    studio: "Estúdio",
    studioText: "WordQuest é um jogo da Lunara Games.",
    vocabulary: "Vocabulário",
    vocabBefore: "As palavras vêm de uma lista derivada do ",
    vocabName: "VERO",
    vocabAfter:
      " (Verificador Ortográfico Livre, pt_BR, versão 3.2, 2013), de Raimundo Santos Moura e da comunidade do LibreOffice (github.com/LibreOffice/dictionaries). Licenças: LGPLv3 e Mozilla Public License. Copyright © 2006–2013 Raimundo Santos Moura. As pistas foram escritas para o jogo.",
    music: "Música",
    musicText:
      "“Where the River Bends”: faixa gerada com inteligência artificial (o arquivo traz credenciais de conteúdo C2PA da Google).",
    art: "Arte",
    artText:
      "Cenários, mapas, personagens, ícones e logo foram criados com ferramentas de inteligência artificial (Leonardo.ai, ChatGPT e um gerador de imagens integrado) e ajustados para o jogo.",
    font: "Fonte",
    fontText:
      "Nunito, de Vernon Adams e colaboradores, sob a SIL Open Font License 1.1 (distribuída pelo Fontsource).",
    software: "Software livre",
    capacitor: "Capacitor (núcleo, Android e vibração), vite-plugin-pwa",
  },
  en: {
    eyebrow: "WHO HELPED MAKE THIS GAME",
    title: "Credits and licenses",
    deck: "Credits",
    back: "Back to profile",
    studio: "Studio",
    studioText: "WordQuest is a Lunara Games game.",
    vocabulary: "Vocabulary",
    vocabBefore: "The words are checked against ",
    vocabName:
      "ENABLE (Enhanced North American Benchmark Lexicon), public domain",
    vocabAfter: ". The clues were written for the game.",
    music: "Music",
    musicText:
      "“Where the River Bends”: track made with artificial intelligence (the file carries Google's C2PA content credentials).",
    art: "Art",
    artText:
      "Scenery, maps, characters, icons and the logo were made with artificial intelligence tools (Leonardo.ai, ChatGPT and a built-in image generator) and adjusted for the game.",
    font: "Font",
    fontText:
      "Nunito, by Vernon Adams and contributors, under the SIL Open Font License 1.1 (distributed by Fontsource).",
    software: "Open-source software",
    capacitor: "Capacitor (core, Android and haptics), vite-plugin-pwa",
  },
});

/** Vídeo premiado (opcional): loja, atalho de quem não tem moedas e fim do duelo. */
export const rewardedT = texts({
  pt: {
    cardTitle: "Moedas grátis",
    cardShort: "Sem moedas?",
    cardLeft: (left: number) =>
      `Vídeo curto · ${left === 1 ? "resta 1 hoje" : `restam ${left} hoje`}`,
    watch: (coins: number) => `Assistir vídeo: +${coins} moedas`,
    double: (coins: number) => `Dobrar moedas: vídeo +${coins}`,
    doubleLabel: (coins: number) =>
      `Assistir a um vídeo para dobrar as moedas: mais ${coins}`,
    loading: "Abrindo o vídeo…",
    earned: (coins: number) => `+${coins} moedas! Obrigado por assistir.`,
    closedEarly: "Assista até o fim para ganhar as moedas.",
    failed: "O vídeo não abriu agora. Tente mais tarde.",
    simTitle: "Vídeo de teste (simulado)",
    simWait: (s: number) => `A recompensa chega em ${s} s…`,
    simDone: "Recompensa garantida! Pode fechar.",
    simClose: "Fechar vídeo",
  },
  en: {
    cardTitle: "Free coins",
    cardShort: "Short on coins?",
    cardLeft: (left: number) => `Quick video · ${left} left today`,
    watch: (coins: number) => `Watch video: +${coins} coins`,
    double: (coins: number) => `Double coins: video +${coins}`,
    doubleLabel: (coins: number) =>
      `Watch a video to double your coins: ${coins} more`,
    loading: "Opening the video…",
    earned: (coins: number) => `+${coins} coins! Thanks for watching.`,
    closedEarly: "Watch until the end to get the coins.",
    failed: "The video didn't open right now. Try again later.",
    simTitle: "Test video (simulated)",
    simWait: (s: number) => `Reward in ${s} s…`,
    simDone: "Reward earned! You can close it.",
    simClose: "Close video",
  },
});
