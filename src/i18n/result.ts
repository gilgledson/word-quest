/**
 * Textos do fim da partida (cartão do resultado), do botão de compartilhar, do texto compartilhado
 * (desafio do dia e tabuleiro) e do baú.
 */
import { texts } from "./index";

/** Cartão do resultado (`ResultSheet`). */
export const resultText = texts({
  pt: {
    win: "Você venceu!",
    draw: "Empate!",
    loss: (rival: string) => `${rival} venceu`,
    back: "Voltar",
    otherTheme: "Outro tema",
    rematch: "Revanche",
    rematchRetry: "Revanche: tentar de novo",
    rematchReplay: "Revanche: jogar de novo",
    sheet: "Resultado da partida",
    viewBoard: "Ver tabuleiro",
    viewResult: (title: string) => `Ver resultado: ${title}`,
    finalScore: "Placar final",
    pts: "pts",
    lossCost: (n: number) => `A derrota custou ${n} moedas`,
    dailyReward: (n: number) => `Recompensa diária: ${n} moedas`,
    duelReward: (n: number) => `Recompensa do duelo: ${n} moedas`,
    /** Palavra depois do "+5" / "−5" visível. */
    coins: (_n: number) => "moedas",
    achievements: (n: number): string => (n === 1 ? "Conquista" : "Conquistas"),
    claimInProfile: ". Resgate no Perfil.",
    newWorld: "Novo mundo aberto: ",
    newWorldEnd: "!",
    dailyHint: "Vença o oponente para concluir o desafio do dia.",
    inviteLabel: "Desafiar um amigo online",
    invite: "Desafie um amigo: ",
    bestWord: "Melhor palavra",
    nextLevel: "Próxima fase",
    nextLevelVs: (rival: string) => `Próxima fase · vs ${rival}`,
    share: "Compartilhar",
  },
  en: {
    win: "You won!",
    draw: "Draw!",
    loss: (rival: string) => `${rival} won`,
    back: "Back",
    otherTheme: "New theme",
    rematch: "Rematch",
    rematchRetry: "Rematch: try again",
    rematchReplay: "Rematch: play again",
    sheet: "Match result",
    viewBoard: "View board",
    viewResult: (title: string) => `View result: ${title}`,
    finalScore: "Final score",
    pts: "pts",
    lossCost: (n: number) => `The loss cost ${n} ${n === 1 ? "coin" : "coins"}`,
    dailyReward: (n: number) =>
      `Daily reward: ${n} ${n === 1 ? "coin" : "coins"}`,
    duelReward: (n: number) =>
      `Duel reward: ${n} ${n === 1 ? "coin" : "coins"}`,
    coins: (n: number) => (n === 1 ? "coin" : "coins"),
    achievements: (n: number) => (n === 1 ? "Achievement" : "Achievements"),
    claimInProfile: ". Claim it in your Profile.",
    newWorld: "New world unlocked: ",
    newWorldEnd: "!",
    dailyHint: "Beat your rival to complete the daily challenge.",
    inviteLabel: "Challenge a friend online",
    invite: "Challenge a friend: ",
    bestWord: "Best word",
    nextLevel: "Next level",
    nextLevelVs: (rival: string) => `Next level · vs ${rival}`,
    share: "Share",
  },
  es: {
    win: "¡Ganaste!",
    draw: "¡Empate!",
    loss: (rival: string) => `${rival} ganó`,
    back: "Volver",
    otherTheme: "Otro tema",
    rematch: "Revancha",
    rematchRetry: "Revancha: intentar de nuevo",
    rematchReplay: "Revancha: jugar de nuevo",
    sheet: "Resultado de la partida",
    viewBoard: "Ver tablero",
    viewResult: (title: string) => `Ver resultado: ${title}`,
    finalScore: "Marcador final",
    pts: "pts",
    lossCost: (n: number) =>
      `La derrota costó ${n} ${n === 1 ? "moneda" : "monedas"}`,
    dailyReward: (n: number) =>
      `Recompensa diaria: ${n} ${n === 1 ? "moneda" : "monedas"}`,
    duelReward: (n: number) =>
      `Recompensa del duelo: ${n} ${n === 1 ? "moneda" : "monedas"}`,
    coins: (n: number) => (n === 1 ? "moneda" : "monedas"),
    achievements: (n: number) => (n === 1 ? "Logro" : "Logros"),
    claimInProfile: ". Reclámalo en tu Perfil.",
    newWorld: "¡Nuevo mundo desbloqueado: ",
    newWorldEnd: "!",
    dailyHint: "Vence a tu rival para completar el desafío diario.",
    inviteLabel: "Desafiar a un amigo en línea",
    invite: "Desafía a un amigo: ",
    bestWord: "Mejor palabra",
    nextLevel: "Siguiente nivel",
    nextLevelVs: (rival: string) => `Siguiente nivel · vs ${rival}`,
    share: "Compartir",
  },
});

/** Botão de compartilhar e a folha do sistema (`ShareResultButton`, `shareText`). */
export const shareUiText = texts({
  pt: {
    shareResult: "Compartilhar resultado",
    copied: "Resultado copiado! É só colar na conversa.",
    sendInvite: "Enviar convite",
  },
  en: {
    shareResult: "Share result",
    copied: "Result copied! Just paste it into a chat.",
    sendInvite: "Send invite",
  },
  es: {
    shareResult: "Compartir resultado",
    copied: "¡Resultado copiado! Solo pégalo en el chat.",
    sendInvite: "Enviar invitación",
  },
});

const count = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** Texto que o jogador compartilha (`dailyShare.ts`). Os emojis ficam iguais nos dois idiomas. */
export const sharedText = texts({
  pt: {
    win: (rival: string) => `⚔️ Vitória sobre ${rival}!`,
    draw: (rival: string) => `🤝 Empate com ${rival}!`,
    loss: (rival: string) => `😤 Derrota para ${rival}`,
    dailyTitle: (day: string, month: string) =>
      `🏆 WordQuest · Desafio de ${day}/${month}`,
    myLetters: (mine: number, rival: string, theirs: number) =>
      `🟦 minhas letras: ${mine} · 🟥 ${rival}: ${theirs}`,
    score: (p: number, ai: number) => `🎯 Pontuação: ${p} × ${ai}`,
    misses: (n: number) => `❌ ${count(n, "erro", "erros")}`,
    noMisses: "✅ sem erros",
    hints: (n: number) => `💡 ${count(n, "dica", "dicas")}`,
    noHints: "💡 sem dicas",
    streak: (n: number) => `🔥 ${n} dias seguidos`,
    beatMe: "Consegue me vencer?",
    boardLegend: (rival: string) =>
      `Preenchidas: minhas letras · Vazadas: ${rival}`,
    best: (word: string) => `🔥 Melhor palavra: ${word}`,
  },
  en: {
    win: (rival: string) => `⚔️ Won against ${rival}!`,
    draw: (rival: string) => `🤝 Draw with ${rival}!`,
    loss: (rival: string) => `😤 Lost to ${rival}`,
    dailyTitle: (day: string, month: string) =>
      `🏆 WordQuest · Daily challenge ${month}/${day}`,
    myLetters: (mine: number, rival: string, theirs: number) =>
      `🟦 my letters: ${mine} · 🟥 ${rival}: ${theirs}`,
    score: (p: number, ai: number) => `🎯 Score: ${p} × ${ai}`,
    misses: (n: number) => `❌ ${count(n, "mistake", "mistakes")}`,
    noMisses: "✅ no mistakes",
    hints: (n: number) => `💡 ${count(n, "hint", "hints")}`,
    noHints: "💡 no hints",
    streak: (n: number) => `🔥 ${n}-day streak`,
    beatMe: "Can you beat me?",
    boardLegend: (rival: string) => `Filled: my letters · Outlined: ${rival}`,
    best: (word: string) => `🔥 Best word: ${word}`,
  },
  es: {
    win: (rival: string) => `⚔️ ¡Victoria contra ${rival}!`,
    draw: (rival: string) => `🤝 ¡Empate con ${rival}!`,
    loss: (rival: string) => `😤 Derrota ante ${rival}`,
    dailyTitle: (day: string, month: string) =>
      `🏆 WordQuest · Desafío del ${day}/${month}`,
    myLetters: (mine: number, rival: string, theirs: number) =>
      `🟦 mis letras: ${mine} · 🟥 ${rival}: ${theirs}`,
    score: (p: number, ai: number) => `🎯 Puntuación: ${p} × ${ai}`,
    misses: (n: number) => `❌ ${count(n, "error", "errores")}`,
    noMisses: "✅ sin errores",
    hints: (n: number) => `💡 ${count(n, "ayuda", "ayudas")}`,
    noHints: "💡 sin ayudas",
    streak: (n: number) => `🔥 ${n} días seguidos`,
    beatMe: "¿Puedes ganarme?",
    boardLegend: (rival: string) => `Rellenas: mis letras · Vacías: ${rival}`,
    best: (word: string) => `🔥 Mejor palabra: ${word}`,
  },
});

/** Baú aberto na tela inicial (`ChestReward`). */
export const chestText = texts({
  pt: {
    opened: "Baú aberto!",
    coins: (_n: number) => "moedas",
  },
  en: {
    opened: "Chest opened!",
    coins: (n: number) => (n === 1 ? "coin" : "coins"),
  },
  es: {
    opened: "¡Cofre abierto!",
    coins: (n: number) => (n === 1 ? "moneda" : "monedas"),
  },
});
