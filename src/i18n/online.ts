import { texts } from ".";

/** Textos do duelo ao vivo (lobby, configuração, sala, aviso de partida em andamento). */
export const onlineText = texts({
  pt: {
    // Tamanhos de tabuleiro
    sizes: {
      "6x6": { nome: "Rápido", tempo: "~1 min" },
      "6x7": { nome: "Leve", tempo: "~1,5 min" },
      "7x7": { nome: "Médio", tempo: "~2 min" },
      "8x8": { nome: "Longo", tempo: "~3 min" },
    } as Record<string, { nome: string; tempo: string }>,
    boardSizeTitle: "Tamanho do tabuleiro",
    sizeAria: (label: string, nome: string, tempo: string) =>
      `${label}, ${nome}, ${tempo.replace("~", "cerca de ")}`,
    surprise: "Surpresa",
    // Idioma da sala (as pistas da grade são no idioma de quem criou)
    langLabel: "Pistas em",
    langName: { pt: "português", en: "inglês" } as Record<string, string>,
    otherLang: (name: string) =>
      `Este duelo é em ${name}: as pistas aparecem em ${name} para os dois.`,
    noLimit: "Sem limite",
    // Rival
    friendName: "Amigo",
    rivalTagline: "Boa partida!",
    rivalWin: "Essa foi minha!",
    rivalLose: "Boa! Você mereceu.",
    inviteText: (code: string, link: string) =>
      `Te desafio no WordQuest! Toque para entrar no duelo: ${link}\n` +
      `Ou abra o jogo, toque em "Jogar com um amigo" e digite o código ${code}.`,
    // Erros
    unavailable:
      "Não foi possível falar com o servidor. Confira a internet e tente de novo.",
    updateApp: "Atualize o WordQuest na Play Store para jogar o duelo ao vivo.",
    unverifiedBrowser:
      "Não conseguimos verificar este navegador. Tente de novo ou jogue pelo app.",
    missing: "Não achei nenhuma partida com esse código.",
    full: "Essa partida já tem dois jogadores.",
    over: "Essa partida já terminou.",
    // Lobby
    eyebrow: "DUELO AO VIVO",
    playWithFriend: "Jogar com um amigo",
    // Procurar oponente
    findOpponent: "Procurar oponente",
    findOpponentHint: "Sem amigo agora? Jogue com alguém online, sem código.",
    searching: "Procurando oponente…",
    searchingText: "Partida rápida 6×6, até 1 min por jogada.",
    found: "Oponente encontrado!",
    waitTime: "Tempo de espera:",
    getReady: "Prepare-se para o duelo!",
    notAvailable: "O duelo ao vivo ainda não está disponível nesta versão.",
    back: "Voltar",
    createMatch: "Criar partida",
    joinWithCode: "Entrar com código",
    chooseTheme: "Escolha o tema",
    setupMatch: "Configurar partida",
    matchCode: "Código da partida",
    codeHint: "Digite o código enviado pelo seu amigo.",
    join: "Entrar",
    defaultPlayer: "Jogador",
    // Regras
    rulesAria: "Regras da partida",
    themeLabel: "Tema:",
    boardLabel: "Tabuleiro:",
    turnLabel: "Jogada:",
    betLabel: "Aposta:",
    betCoins: (n: number) => `${n} moedas`,
    noBet: "sem aposta",
    matchOf: (name: string) => `Partida de ${name}`,
    cantBet: (coins: number, bet: number) =>
      `Você tem ${coins} moedas: não dá para apostar ${bet}.`,
    winnerTakes: (prize: number, coins: number) =>
      `Quem vencer leva ${prize} moedas. Você tem ${coins}.`,
    joinAndBet: (bet: number) => `Entrar e apostar ${bet}`,
    joinMatch: "Entrar na partida",
    // Configuração
    you: "Você",
    yourFriend: "Seu amigo",
    change: "trocar",
    turnTime: "Tempo por jogada",
    free: "Livre",
    bet: "Aposta",
    none: "Sem",
    eachBets: (bet: number, prize: number, coins: number) =>
      `Cada um aposta ${bet}: quem vencer leva ${prize} moedas. Você tem ${coins}.`,
    noBetMatch: (coins: number) =>
      `Partida sem aposta. Você tem ${coins} moedas.`,
    // Sala
    cantJoin: "Não deu para entrar",
    joining: "Entrando na partida…",
    oneMoment: "Só um instante.",
    notFound: "Partida não encontrada",
    notFoundText:
      "Essa partida não existe mais. Crie outra e mande o código novo.",
    copyFailed: "Não deu para copiar. Anote o código acima.",
    callFriend: "Chame seu amigo",
    sendCode: "Mande este código. A partida começa assim que ele entrar.",
    codeAria: (code: string) => `Código ${code}`,
    inviteCopied: "Convite copiado!",
    shareInvite: "Compartilhar convite",
    codeCopied: "Código copiado!",
    copyCode: "Copiar código",
    inviteBonus: (coins: number, left: number) =>
      `Ganhe ${coins} moedas quando um amigo novo jogar com você (faltam ${left}).`,
    cancel: "Cancelar",
    victory: "Vitória!",
    rivalLeft: (name: string, coins: number) =>
      `${name} saiu da partida. Você ganhou ${coins} moedas.`,
    matchEnded: "Partida encerrada",
    expired:
      "A partida ficou parada por mais de um dia e foi encerrada. Ninguém ganhou nem perdeu.",
    rivalEnded: (name: string, min: number) =>
      `${name} encerrou a partida porque você ficou fora por mais de ${min} minutos.`,
    youLeft: "Você saiu desta partida.",
    inviteRewarded: (coins: number, name: string) =>
      `Convite recompensado: +${coins} moedas por jogar com ${name}!`,
    betWon: (n: number) => `Aposta ganha: +${n} moedas!`,
    betDraw: "Empate: sua aposta voltou.",
    betLost: (n: number) => `Aposta perdida: ${n} moedas.`,
    leaveWarning: (code: string, min: number, name: string) =>
      `Sair da partida? Para voltar, use "Voltar para a partida" em Jogar com um amigo (código ${code}). Se ficar fora por mais de ${min} minutos, ${name} pode encerrar e ficar com a vitória.`,
    rivalOfflineTap: (name: string) =>
      `${name} está sem conexão. Toque no rosto para encerrar e vencer.`,
    rivalOffline: (name: string) => `${name} está sem conexão…`,
    claimWin: (name: string, min: number) =>
      `${name} está sem conexão há mais de ${min} minutos. Encerrar a partida e ficar com a vitória?`,
    // Perfil
    whoPlays: "Quem vai jogar?",
    profileAria: "Seu nome e avatar",
    profileHint: "Seu amigo vai ver este nome e este avatar na partida.",
    chooseAvatar: "Escolha seu avatar",
    avatars: "Avatares",
    yourName: "Seu nome",
    namePlaceholder: "Como seu amigo te chama",
    joinDuel: "Entrar no duelo",
    continue: "Continuar",
    // Aviso de partida em andamento
    inProgress: "Partida em andamento",
    code: "Código",
    backToMatch: (code: string) => `Voltar para a partida ${code}`,
    endMatchAria: (code: string) => `Encerrar a partida ${code}`,
    endConfirm: (code: string) =>
      `Encerrar a partida ${code}? Se ela já começou, conta como derrota para você.`,
    end: "Encerrar",
  },
  en: {
    sizes: {
      "6x6": { nome: "Quick", tempo: "~1 min" },
      "6x7": { nome: "Light", tempo: "~1.5 min" },
      "7x7": { nome: "Medium", tempo: "~2 min" },
      "8x8": { nome: "Long", tempo: "~3 min" },
    },
    boardSizeTitle: "Board size",
    sizeAria: (label, nome, tempo) =>
      `${label}, ${nome}, ${tempo.replace("~", "about ")}`,
    surprise: "Surprise",
    langLabel: "Clues in",
    langName: { pt: "Portuguese", en: "English" },
    otherLang: (name) =>
      `This duel is in ${name}: both players see the clues in ${name}.`,
    noLimit: "No limit",
    friendName: "Friend",
    rivalTagline: "Good game!",
    rivalWin: "That one's mine!",
    rivalLose: "Nice! You earned it.",
    inviteText: (code, link) =>
      `I challenge you on WordQuest! Tap to join the duel: ${link}\n` +
      `Or open the game, tap "Play with a friend" and enter the code ${code}.`,
    unavailable:
      "Couldn't reach the server. Check your connection and try again.",
    updateApp: "Update WordQuest on the Play Store to play live duels.",
    unverifiedBrowser:
      "We couldn't verify this browser. Try again or play in the app.",
    missing: "No match found with that code.",
    full: "This match already has two players.",
    over: "This match is already over.",
    eyebrow: "LIVE DUEL",
    playWithFriend: "Play with a friend",
    // Find opponent
    findOpponent: "Find an opponent",
    findOpponentHint: "No friend around? Play someone online, no code needed.",
    searching: "Looking for an opponent…",
    searchingText: "Quick 6×6 match, up to 1 min per move.",
    found: "Opponent found!",
    waitTime: "Waiting:",
    getReady: "Get ready to duel!",
    notAvailable: "Live duels aren't available in this version yet.",
    back: "Back",
    createMatch: "Create match",
    joinWithCode: "Join with code",
    chooseTheme: "Choose a theme",
    setupMatch: "Set up match",
    matchCode: "Match code",
    codeHint: "Enter the code your friend sent you.",
    join: "Join",
    defaultPlayer: "Player",
    rulesAria: "Match rules",
    themeLabel: "Theme:",
    boardLabel: "Board:",
    turnLabel: "Move:",
    betLabel: "Bet:",
    betCoins: (n) => `${n} coins`,
    noBet: "no bet",
    matchOf: (name) => `${name}'s match`,
    cantBet: (coins, bet) =>
      `You have ${coins} coins: not enough to bet ${bet}.`,
    winnerTakes: (prize, coins) =>
      `The winner takes ${prize} coins. You have ${coins}.`,
    joinAndBet: (bet) => `Join and bet ${bet}`,
    joinMatch: "Join match",
    you: "You",
    yourFriend: "Your friend",
    change: "change",
    turnTime: "Time per move",
    free: "None",
    bet: "Bet",
    none: "None",
    eachBets: (bet, prize, coins) =>
      `You each bet ${bet}: the winner takes ${prize} coins. You have ${coins}.`,
    noBetMatch: (coins) => `No bet this match. You have ${coins} coins.`,
    cantJoin: "Couldn't join",
    joining: "Joining the match…",
    oneMoment: "Just a moment.",
    notFound: "Match not found",
    notFoundText:
      "This match doesn't exist anymore. Create a new one and send the new code.",
    copyFailed: "Couldn't copy. Write down the code above.",
    callFriend: "Invite your friend",
    sendCode: "Send this code. The match starts as soon as they join.",
    codeAria: (code) => `Code ${code}`,
    inviteCopied: "Invite copied!",
    shareInvite: "Share invite",
    codeCopied: "Code copied!",
    copyCode: "Copy code",
    inviteBonus: (coins, left) =>
      `Get ${coins} coins when a new friend plays with you (${left} left).`,
    cancel: "Cancel",
    victory: "Victory!",
    rivalLeft: (name, coins) =>
      `${name} left the match. You won ${coins} coins.`,
    matchEnded: "Match over",
    expired:
      "The match sat idle for over a day and was closed. Nobody won or lost.",
    rivalEnded: (name, min) =>
      `${name} ended the match because you were away for over ${min} minutes.`,
    youLeft: "You left this match.",
    inviteRewarded: (coins, name) =>
      `Invite reward: +${coins} coins for playing with ${name}!`,
    betWon: (n) => `Bet won: +${n} coins!`,
    betDraw: "Draw: your bet came back.",
    betLost: (n) => `Bet lost: ${n} coins.`,
    leaveWarning: (code, min, name) =>
      `Leave the match? To come back, use "Back to match" in Play with a friend (code ${code}). If you're away for over ${min} minutes, ${name} can end it and take the win.`,
    rivalOfflineTap: (name) =>
      `${name} is offline. Tap their face to end the match and win.`,
    rivalOffline: (name) => `${name} is offline…`,
    claimWin: (name, min) =>
      `${name} has been offline for over ${min} minutes. End the match and take the win?`,
    whoPlays: "Who's playing?",
    profileAria: "Your name and avatar",
    profileHint: "Your friend will see this name and avatar in the match.",
    chooseAvatar: "Choose your avatar",
    avatars: "Avatars",
    yourName: "Your name",
    namePlaceholder: "What your friend calls you",
    joinDuel: "Join the duel",
    continue: "Continue",
    inProgress: "Match in progress",
    code: "Code",
    backToMatch: (code) => `Back to match ${code}`,
    endMatchAria: (code) => `End match ${code}`,
    endConfirm: (code) =>
      `End match ${code}? If it already started, it counts as a loss for you.`,
    end: "End",
  },
});
