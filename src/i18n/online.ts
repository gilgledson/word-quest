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
    langName: { pt: "português", en: "inglês", es: "espanhol" } as Record<
      string,
      string
    >,
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
    searchingText: "Partida rápida 6×6, por turnos.",
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
    sendCode:
      "Mande este código. A partida começa quando ele entrar, mesmo mais tarde.",
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
      "Ninguém entrou na partida em 2 dias e ela foi encerrada. Ninguém ganhou nem perdeu.",
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
    // Duelo por turnos
    waitingAsync:
      "Pode fechar o jogo: a partida fica em Minhas partidas e você joga quando for sua vez.",
    theirTurn: (name: string, hours: number) =>
      `Vez de ${name}. Pode sair do jogo: ${name} tem até ${hours} h para jogar.`,
    rivalTimedOut: (name: string, coins: number) =>
      `${name} não jogou em 48 h. A vitória é sua: +${coins} moedas.`,
    youTimedOut: (name: string) =>
      `Você não jogou em 48 h e a vitória ficou com ${name}.`,
    deadlineLabel: "Prazo por jogada:",
    deadline: "48 h",
    myMatches: "Minhas partidas",
    yourTurn: "Sua vez!",
    yourTurnVs: (name: string) => `Sua vez contra ${name}`,
    yourTurnCount: (n: number) =>
      n === 1 ? "É sua vez em 1 partida!" : `É sua vez em ${n} partidas!`,
    theirTurnShort: (name: string, hours: number) =>
      `Vez de ${name} · ${hours} h`,
    waitingShort: (code: string) => `Esperando alguém entrar · ${code}`,
    queued: "Na fila: esperando um oponente",
    opponent: "Oponente",
    pushChannel: "Duelos",
    pushChannelText: "Avisa quando é sua vez num duelo por turnos.",
    endedShort: "Terminou · ver resultado",
    play: "Jogar",
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
    langName: { pt: "Portuguese", en: "English", es: "Spanish" },
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
    searchingText: "Quick 6×6 match, turn by turn.",
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
    sendCode: "Send this code. The match starts when they join, even later on.",
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
      "Nobody joined the match in 2 days, so it was closed. Nobody won or lost.",
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
    waitingAsync:
      "You can close the game: the match stays in My matches and you play when it's your turn.",
    theirTurn: (name, hours) =>
      `${name}'s turn. You can leave the game: ${name} has up to ${hours} h to play.`,
    rivalTimedOut: (name, coins) =>
      `${name} didn't play within 48 h. The win is yours: +${coins} coins.`,
    youTimedOut: (name) =>
      `You didn't play within 48 h, so ${name} took the win.`,
    deadlineLabel: "Time per move:",
    deadline: "48 h",
    myMatches: "My matches",
    yourTurn: "Your turn!",
    yourTurnVs: (name) => `Your turn against ${name}`,
    yourTurnCount: (n) =>
      n === 1
        ? "It's your turn in 1 match!"
        : `It's your turn in ${n} matches!`,
    theirTurnShort: (name, hours) => `${name}'s turn · ${hours} h`,
    waitingShort: (code) => `Waiting for someone to join · ${code}`,
    queued: "In the queue: waiting for an opponent",
    opponent: "Opponent",
    pushChannel: "Duels",
    pushChannelText: "Lets you know when it's your turn in a turn-based duel.",
    endedShort: "Finished · see result",
    play: "Play",
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
  es: {
    sizes: {
      "6x6": { nome: "Rápido", tempo: "~1 min" },
      "6x7": { nome: "Ligero", tempo: "~1.5 min" },
      "7x7": { nome: "Medio", tempo: "~2 min" },
      "8x8": { nome: "Largo", tempo: "~3 min" },
    },
    boardSizeTitle: "Tamaño del tablero",
    sizeAria: (label, nome, tempo) =>
      `${label}, ${nome}, ${tempo.replace("~", "unos ")}`,
    surprise: "Sorpresa",
    langLabel: "Pistas en",
    langName: { pt: "portugués", en: "inglés", es: "español" },
    otherLang: (name) =>
      `Este duelo es en ${name}: los dos ven las pistas en ${name}.`,
    noLimit: "Sin límite",
    friendName: "Amigo",
    rivalTagline: "¡Buena partida!",
    rivalWin: "¡Esta fue mía!",
    rivalLose: "¡Bien! Te lo ganaste.",
    inviteText: (code, link) =>
      `¡Te reto en WordQuest! Toca para entrar al duelo: ${link}\n` +
      `O abre el juego, toca "Jugar con un amigo" e ingresa el código ${code}.`,
    unavailable:
      "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    updateApp: "Actualiza WordQuest en Play Store para jugar duelos en vivo.",
    unverifiedBrowser:
      "No pudimos verificar este navegador. Inténtalo de nuevo o juega en la app.",
    missing: "No encontré ninguna partida con ese código.",
    full: "Esta partida ya tiene dos jugadores.",
    over: "Esta partida ya terminó.",
    eyebrow: "DUELO EN VIVO",
    playWithFriend: "Jugar con un amigo",
    findOpponent: "Buscar rival",
    findOpponentHint:
      "¿No hay amigos cerca? Juega con alguien en línea, sin código.",
    searching: "Buscando rival…",
    searchingText: "Partida rápida de 6×6, por turnos.",
    found: "¡Rival encontrado!",
    waitTime: "Tiempo de espera:",
    getReady: "¡Prepárate para el duelo!",
    notAvailable:
      "Los duelos en vivo aún no están disponibles en esta versión.",
    back: "Volver",
    createMatch: "Crear partida",
    joinWithCode: "Entrar con código",
    chooseTheme: "Elige un tema",
    setupMatch: "Configurar partida",
    matchCode: "Código de la partida",
    codeHint: "Ingresa el código que te envió tu amigo.",
    join: "Entrar",
    defaultPlayer: "Jugador",
    rulesAria: "Reglas de la partida",
    themeLabel: "Tema:",
    boardLabel: "Tablero:",
    turnLabel: "Jugada:",
    betLabel: "Apuesta:",
    betCoins: (n) => `${n} monedas`,
    noBet: "sin apuesta",
    matchOf: (name) => `Partida de ${name}`,
    cantBet: (coins, bet) =>
      `Tienes ${coins} monedas: no te alcanza para apostar ${bet}.`,
    winnerTakes: (prize, coins) =>
      `Quien gane se lleva ${prize} monedas. Tienes ${coins}.`,
    joinAndBet: (bet) => `Entrar y apostar ${bet}`,
    joinMatch: "Entrar a la partida",
    you: "Tú",
    yourFriend: "Tu amigo",
    change: "cambiar",
    turnTime: "Tiempo por jugada",
    free: "Libre",
    bet: "Apuesta",
    none: "Sin",
    eachBets: (bet, prize, coins) =>
      `Cada uno apuesta ${bet}: quien gane se lleva ${prize} monedas. Tienes ${coins}.`,
    noBetMatch: (coins) => `Partida sin apuesta. Tienes ${coins} monedas.`,
    cantJoin: "No se pudo entrar",
    joining: "Entrando a la partida…",
    oneMoment: "Un momento.",
    notFound: "Partida no encontrada",
    notFoundText:
      "Esta partida ya no existe. Crea otra y envía el código nuevo.",
    copyFailed: "No se pudo copiar. Anota el código de arriba.",
    callFriend: "Invita a tu amigo",
    sendCode:
      "Envía este código. La partida empieza cuando tu amigo entre, aunque sea más tarde.",
    codeAria: (code) => `Código ${code}`,
    inviteCopied: "¡Invitación copiada!",
    shareInvite: "Compartir invitación",
    codeCopied: "¡Código copiado!",
    copyCode: "Copiar código",
    inviteBonus: (coins, left) =>
      `Gana ${coins} monedas cuando un amigo nuevo juegue contigo (faltan ${left}).`,
    cancel: "Cancelar",
    victory: "¡Victoria!",
    rivalLeft: (name, coins) =>
      `${name} salió de la partida. Ganaste ${coins} monedas.`,
    matchEnded: "Partida terminada",
    expired:
      "Nadie entró a la partida en 2 días y se cerró. Nadie ganó ni perdió.",
    rivalEnded: (name, min) =>
      `${name} terminó la partida porque estuviste fuera más de ${min} minutos.`,
    youLeft: "Saliste de esta partida.",
    inviteRewarded: (coins, name) =>
      `Premio por invitar: ¡+${coins} monedas por jugar con ${name}!`,
    betWon: (n) => `Apuesta ganada: ¡+${n} monedas!`,
    betDraw: "Empate: recuperaste tu apuesta.",
    betLost: (n) => `Apuesta perdida: ${n} monedas.`,
    leaveWarning: (code, min, name) =>
      `¿Salir de la partida? Para volver, usa "Volver a la partida" en Jugar con un amigo (código ${code}). Si estás fuera más de ${min} minutos, ${name} puede terminarla y quedarse con la victoria.`,
    rivalOfflineTap: (name) =>
      `${name} está sin conexión. Toca su cara para terminar la partida y ganar.`,
    rivalOffline: (name) => `${name} está sin conexión…`,
    claimWin: (name, min) =>
      `${name} lleva más de ${min} minutos sin conexión. ¿Terminar la partida y quedarte con la victoria?`,
    waitingAsync:
      "Puedes cerrar el juego: la partida queda en Mis partidas y juegas cuando sea tu turno.",
    theirTurn: (name, hours) =>
      `Turno de ${name}. Puedes salir del juego: ${name} tiene hasta ${hours} h para jugar.`,
    rivalTimedOut: (name, coins) =>
      `${name} no jugó en 48 h. La victoria es tuya: +${coins} monedas.`,
    youTimedOut: (name) => `No jugaste en 48 h y la victoria fue para ${name}.`,
    deadlineLabel: "Plazo por jugada:",
    deadline: "48 h",
    myMatches: "Mis partidas",
    yourTurn: "¡Tu turno!",
    yourTurnVs: (name) => `Tu turno contra ${name}`,
    yourTurnCount: (n) =>
      n === 1 ? "¡Es tu turno en 1 partida!" : `¡Es tu turno en ${n} partidas!`,
    theirTurnShort: (name, hours) => `Turno de ${name} · ${hours} h`,
    waitingShort: (code) => `Esperando que alguien entre · ${code}`,
    queued: "En la fila: esperando un rival",
    opponent: "Rival",
    pushChannel: "Duelos",
    pushChannelText: "Te avisa cuando es tu turno en un duelo por turnos.",
    endedShort: "Terminó · ver resultado",
    play: "Jugar",
    whoPlays: "¿Quién va a jugar?",
    profileAria: "Tu nombre y avatar",
    profileHint: "Tu amigo verá este nombre y este avatar en la partida.",
    chooseAvatar: "Elige tu avatar",
    avatars: "Avatares",
    yourName: "Tu nombre",
    namePlaceholder: "Cómo te llama tu amigo",
    joinDuel: "Entrar al duelo",
    continue: "Continuar",
    inProgress: "Partida en curso",
    code: "Código",
    backToMatch: (code) => `Volver a la partida ${code}`,
    endMatchAria: (code) => `Terminar la partida ${code}`,
    endConfirm: (code) =>
      `¿Terminar la partida ${code}? Si ya empezó, cuenta como derrota para ti.`,
    end: "Terminar",
  },
});
