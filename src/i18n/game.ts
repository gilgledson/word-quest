/**
 * Textos das regras e recompensas do jogo (conquistas, loja, avatares, níveis do rival), dos
 * lembretes diários e das mensagens de erro do progresso.
 */
import { texts } from "./index";

type Pair = { title: string; text: string };

const achievementsPt = {
  "primeiro-passo": {
    title: "O primeiro passo",
    text: "Vença sua primeira fase.",
  },
  "palavras-25": {
    title: "Aprendiz de palavras",
    text: "Descubra 25 palavras.",
  },
  "palavras-100": { title: "Colecionador", text: "Descubra 100 palavras." },
  "palavras-300": {
    title: "Dicionário ambulante",
    text: "Descubra 300 palavras.",
  },
  "duelos-5": { title: "Duelista", text: "Vença 5 duelos." },
  "duelos-20": { title: "Campeão dos duelos", text: "Vença 20 duelos." },
  "mao-certeira": {
    title: "Mão certeira",
    text: "Vença um duelo sem errar nenhuma letra.",
  },
  chefe: { title: "Caça-chefes", text: "Vença o chefe de um mundo." },
  "mundo-completo": {
    title: "Mundo completo",
    text: "Vença todas as fases de um mundo.",
  },
  "rivais-6": {
    title: "Sem medo de ninguém",
    text: "Vença 6 rivais diferentes na Aventura.",
  },
  "estrelas-30": { title: "Céu estrelado", text: "Junte 30 estrelas." },
  "diario-1": { title: "Ritual do dia", text: "Vença um Desafio do Dia." },
  "diario-7": {
    title: "Semana perfeita",
    text: "Vença o Desafio do Dia 7 dias seguidos.",
  },
} satisfies Record<string, Pair>;
type AchievementTexts = typeof achievementsPt;

const shopPt = {
  curinga: {
    nome: "Curinga",
    texto: "Entra no seu banco e vira a letra de qualquer casa: sempre acerta.",
    resumo: "Vira a letra de qualquer casa e sempre acerta.",
  },
  vogal: {
    nome: "Kit de vogais",
    texto:
      "5 usos. Em cada um, você escolhe uma vogal que a grade ainda precisa e ela vem para o seu banco.",
    resumo: "Escolha uma vogal que a grade ainda precisa.",
  },
};
type ShopTexts = typeof shopPt;

const avatarsPt = {
  jogador: "Explorador",
  menina: "Aventureira",
  garoto: "Caçador",
  gatinho: "Gatinho",
  panda: "Panda",
  cientista: "Cientista",
  skatista: "Skatista",
  pirata: "Pirata",
  detetive: "Detetive",
  astronauta: "Astronauta",
  cavaleiro: "Cavaleiro",
  coelhinha: "Coelhinha",
  latino: "Latino",
  latina: "Latina",
};
type AvatarTexts = typeof avatarsPt;

export const gameText = texts({
  pt: {
    achievements: achievementsPt as AchievementTexts,
    allBossesTitle: "Lenda dos cinco mundos",
    allBossesText: (n: number) => `Vença os ${n} chefes.`,
    shop: shopPt as ShopTexts,
    avatars: avatarsPt as AvatarTexts,
    levels: { facil: "Fácil", medio: "Médio", dificil: "Difícil" },
    styles: { cuidadoso: "Cuidadoso", agressivo: "Agressivo" },
    loadError:
      "Leitura do progresso indisponível. Verifique o armazenamento do navegador.",
    saveError:
      "Não foi possível salvar. Mantenha esta página aberta e verifique o armazenamento.",
    version: {
      builtin: "do app",
      web: (pack: string) => `Versão web · pacote ${pack}`,
      native: (native: string, pack: string) =>
        `Versão ${native} · pacote ${pack}`,
      pack: (pack: string) => `Pacote ${pack}`,
    },
  },
  en: {
    achievements: {
      "primeiro-passo": {
        title: "The first step",
        text: "Win your first level.",
      },
      "palavras-25": { title: "Word apprentice", text: "Find 25 words." },
      "palavras-100": { title: "Collector", text: "Find 100 words." },
      "palavras-300": {
        title: "Walking dictionary",
        text: "Find 300 words.",
      },
      "duelos-5": { title: "Duelist", text: "Win 5 duels." },
      "duelos-20": { title: "Duel champion", text: "Win 20 duels." },
      "mao-certeira": {
        title: "Steady hand",
        text: "Win a duel without a single wrong letter.",
      },
      chefe: { title: "Boss hunter", text: "Beat a world's boss." },
      "mundo-completo": {
        title: "World complete",
        text: "Win every level in a world.",
      },
      "rivais-6": {
        title: "Fear no one",
        text: "Beat 6 different rivals in Adventure.",
      },
      "estrelas-30": { title: "Starry sky", text: "Collect 30 stars." },
      "diario-1": { title: "Daily ritual", text: "Win a Daily challenge." },
      "diario-7": {
        title: "Perfect week",
        text: "Win the Daily challenge 7 days in a row.",
      },
    },
    allBossesTitle: "Legend of the five worlds",
    allBossesText: (n: number) => `Beat all ${n} bosses.`,
    shop: {
      curinga: {
        nome: "Wild tile",
        texto:
          "Joins your rack and becomes the letter of any square: always right.",
        resumo: "Becomes the letter of any square. Always right.",
      },
      vogal: {
        nome: "Vowel kit",
        texto:
          "5 uses. Each time, pick a vowel the grid still needs and it lands in your rack.",
        resumo: "Pick a vowel the grid still needs.",
      },
    },
    avatars: {
      jogador: "Explorer",
      menina: "Adventurer",
      garoto: "Hunter",
      gatinho: "Kitty",
      panda: "Panda",
      cientista: "Scientist",
      skatista: "Skater",
      pirata: "Pirate",
      detetive: "Detective",
      astronauta: "Astronaut",
      cavaleiro: "Knight",
      coelhinha: "Bunny",
      latino: "Latino",
      latina: "Latina",
    },
    levels: { facil: "Easy", medio: "Medium", dificil: "Hard" },
    styles: { cuidadoso: "Careful", agressivo: "Bold" },
    loadError: "Can't read your progress. Check your browser storage.",
    saveError: "Couldn't save. Keep this page open and check your storage.",
    version: {
      builtin: "built-in",
      web: (pack: string) => `Web version · bundle ${pack}`,
      native: (native: string, pack: string) =>
        `Version ${native} · bundle ${pack}`,
      pack: (pack: string) => `Bundle ${pack}`,
    },
  },
});

/** Notificações locais do lembrete diário. */
export const reminderText = texts({
  pt: {
    title: "Seu desafio do dia chegou!",
    day7: (coins: number) =>
      `Hoje é o Dia 7: um baú com ${coins} moedas está te esperando!`,
    streak: (streak: number, coins: number) =>
      `Não perca sua sequência de ${streak} dias. Recompensa do dia: +${coins} moedas.`,
    plain: (coins: number) =>
      `Uma cruzadinha nova te espera. Recompensa do dia: +${coins} moedas.`,
  },
  en: {
    title: "Your daily challenge is here!",
    day7: (coins: number) =>
      `It's Day 7: a chest with ${coins} coins is waiting for you!`,
    streak: (streak: number, coins: number) =>
      `Don't lose your ${streak}-day streak. Today's reward: +${coins} coins.`,
    plain: (coins: number) =>
      `A new crossword is waiting. Today's reward: +${coins} coins.`,
  },
});
