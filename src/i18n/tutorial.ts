/**
 * Textos do tutorial da fase 1: a jogada guiada (`TutorialCoach`), a dica de passos
 * (`TutorialTip`) e os balões do joyride (`GameTour`).
 */
import { texts } from "./index";

/** Jogada guiada: monta a primeira palavra e confirma. */
export const coachText = texts({
  pt: {
    region: "Tutorial",
    complete: "Palavra completa!",
    tapConfirm: "Toque em ✓ para confirmar",
    points: (n: number) => `+${n} pontos`,
    firstWord: "Monte sua primeira palavra!",
    dragBefore: "Arraste as letras para formar ",
    dragAfter: ".",
    nextLetter: "Próxima letra: ",
    progress: (filled: number, total: number) => `${filled} de ${total} letras`,
    skip: "Pular",
  },
  en: {
    region: "Tutorial",
    complete: "Word completed!",
    tapConfirm: "Tap ✓ to confirm",
    points: (n: number) => `+${n} ${n === 1 ? "point" : "points"}`,
    firstWord: "Build your first word!",
    dragBefore: "Drag the letters to spell ",
    dragAfter: ".",
    nextLetter: "Next letter: ",
    progress: (filled: number, total: number) =>
      `${filled} of ${total} letters`,
    skip: "Skip",
  },
});

/** Dica de 4 passos da primeira rodada. */
export const tipText = texts({
  pt: {
    steps: {
      1: "Toque numa letra do banco para jogar",
      2: "Toque em Confirmar: certa +1, errada −1",
      3: "Vez do rival: as letras roxas são dele",
      4: "Sua vez de novo: mais pontos vence",
    } as Record<number, string>,
    tapLetter: (letter: string) => `Toque no ${letter} que brilha para jogar`,
    gotIt: "Entendi",
    skip: "Pular",
  },
  en: {
    steps: {
      1: "Tap a letter in your rack to play",
      2: "Tap Confirm: right +1, wrong −1",
      3: "Rival's turn: the purple letters are theirs",
      4: "Your turn again: most points wins",
    },
    tapLetter: (letter: string) => `Tap the glowing ${letter} to play`,
    gotIt: "Got it",
    skip: "Skip",
  },
});

/** Balões do joyride: botões e as dicas de conceito. */
export const tourText = texts({
  pt: {
    locale: {
      back: "Voltar",
      close: "Fechar",
      last: "Entendi",
      next: "Próximo",
      nextWithProgress: "Próximo ({current} de {total})",
      skip: "Dispensar",
      open: "Abrir",
    },
    inicioTitle: "Comece pela pista",
    inicio:
      "A resposta vai nas casas azuis, no sentido da seta. Toque em outra pista quando quiser trocar.",
    dueloTitle: "Agora é a vez do rival",
    duelo:
      "Vocês jogam vez a vez. Fechar uma palavra vale a palavra inteira. Quem tiver mais pontos no fim vence!",
    trocarTitle: "Trocar e Dica",
    trocar:
      "Sem letra útil? Trocar renova as letras do banco por moedas. A Dica coloca uma das suas letras na casa certa; confirme para valer ponto.",
    jokerTitle: "Chegou o curinga ★",
    joker:
      "Coloque-o em qualquer casa do tabuleiro. Você pode arrastá-lo para outro lugar; a letra certa só aparece quando confirmar. Você ganha um por partida.",
  },
  en: {
    locale: {
      back: "Back",
      close: "Close",
      last: "Got it",
      next: "Next",
      nextWithProgress: "Next ({current} of {total})",
      skip: "Skip tips",
      open: "Open",
    },
    inicioTitle: "Start with the clue",
    inicio:
      "The answer goes in the blue squares, in the direction of the arrow. Tap another clue anytime to switch.",
    dueloTitle: "Now it's your rival's turn",
    duelo:
      "You take turns. Finishing a word scores the whole word. Most points at the end wins!",
    trocarTitle: "Swap and Hint",
    trocar:
      "No useful letter? Swap gives you new tiles for a few coins. Hint puts one of your letters in the right square; confirm it to score.",
    jokerTitle: "You got a wild tile ★",
    joker:
      "Place it on any square of the board. You can drag it somewhere else; the right letter only shows when you confirm. You get one per match.",
  },
});
