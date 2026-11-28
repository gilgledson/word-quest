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
  // Premium (comprados com moedas na loja, aba Perfil).
  viking: "Viking",
  guerreira: "Guerreira",
  ninja: "Ninja",
  samurai: "Samurai",
  mago: "Mago",
  feiticeira: "Feiticeira",
  rei: "Rei",
  rainha: "Rainha",
  // Premium da cultura indiana (27/11/2026; sem figuras religiosas).
  criquete: "Jogador de Críquete",
  holi: "Holi",
  diwali: "Diwali",
  dancarina: "Dançarina",
  maraja: "Marajá",
  marani: "Marani",
  bollywood: "Estrela de Bollywood",
  diva: "Diva de Bollywood",
  espacial: "Cientista Espacial",
  chai: "Mestre do Chai",
  citara: "Musicista de Cítara",
  kabaddi: "Jogador de Kabaddi",
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
      viking: "Viking",
      guerreira: "Warrior",
      ninja: "Ninja",
      samurai: "Samurai",
      mago: "Wizard",
      feiticeira: "Sorceress",
      rei: "King",
      rainha: "Queen",
      criquete: "Cricketer",
      holi: "Holi",
      diwali: "Diwali",
      dancarina: "Dancer",
      maraja: "Maharaja",
      marani: "Maharani",
      bollywood: "Bollywood Star",
      diva: "Bollywood Diva",
      espacial: "Space Scientist",
      chai: "Chai Master",
      citara: "Sitar Player",
      kabaddi: "Kabaddi Player",
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
  es: {
    achievements: {
      "primeiro-passo": {
        title: "El primer paso",
        text: "Gana tu primer nivel.",
      },
      "palavras-25": {
        title: "Aprendiz de palabras",
        text: "Descubre 25 palabras.",
      },
      "palavras-100": {
        title: "Coleccionista",
        text: "Descubre 100 palabras.",
      },
      "palavras-300": {
        title: "Diccionario andante",
        text: "Descubre 300 palabras.",
      },
      "duelos-5": { title: "Duelista", text: "Gana 5 duelos." },
      "duelos-20": { title: "Campeón de duelos", text: "Gana 20 duelos." },
      "mao-certeira": {
        title: "Pulso firme",
        text: "Gana un duelo sin fallar ninguna letra.",
      },
      chefe: { title: "Cazajefes", text: "Vence al jefe de un mundo." },
      "mundo-completo": {
        title: "Mundo completo",
        text: "Gana todos los niveles de un mundo.",
      },
      "rivais-6": {
        title: "Sin miedo a nadie",
        text: "Vence a 6 rivales distintos en Aventura.",
      },
      "estrelas-30": { title: "Cielo estrellado", text: "Reúne 30 estrellas." },
      "diario-1": { title: "Ritual diario", text: "Gana un Desafío diario." },
      "diario-7": {
        title: "Semana perfecta",
        text: "Gana el Desafío diario 7 días seguidos.",
      },
    },
    allBossesTitle: "Leyenda de los cinco mundos",
    allBossesText: (n: number) => `Vence a los ${n} jefes.`,
    shop: {
      curinga: {
        nome: "Comodín",
        texto:
          "Entra en tu atril y se vuelve la letra de cualquier casilla: siempre acierta.",
        resumo: "Se vuelve la letra de cualquier casilla y siempre acierta.",
      },
      vogal: {
        nome: "Kit de vocales",
        texto:
          "5 usos. En cada uno, eliges una vocal que el tablero todavía necesita y llega a tu atril.",
        resumo: "Elige una vocal que el tablero todavía necesita.",
      },
    },
    avatars: {
      jogador: "Explorador",
      menina: "Aventurera",
      garoto: "Cazador",
      gatinho: "Gatito",
      panda: "Panda",
      cientista: "Científica",
      skatista: "Skater",
      pirata: "Pirata",
      detetive: "Detective",
      astronauta: "Astronauta",
      cavaleiro: "Caballero",
      coelhinha: "Conejita",
      latino: "Latino",
      latina: "Latina",
      viking: "Vikingo",
      guerreira: "Guerrera",
      ninja: "Ninja",
      samurai: "Samurái",
      mago: "Mago",
      feiticeira: "Hechicera",
      rei: "Rey",
      rainha: "Reina",
      criquete: "Jugador de Críquet",
      holi: "Holi",
      diwali: "Diwali",
      dancarina: "Bailarina",
      maraja: "Maharajá",
      marani: "Maharaní",
      bollywood: "Estrella de Bollywood",
      diva: "Diva de Bollywood",
      espacial: "Científica Espacial",
      chai: "Maestro del Chai",
      citara: "Músico de Sitar",
      kabaddi: "Jugador de Kabaddi",
    },
    levels: { facil: "Fácil", medio: "Medio", dificil: "Difícil" },
    styles: { cuidadoso: "Cuidadoso", agressivo: "Agresivo" },
    loadError:
      "No se puede leer tu progreso. Revisa el almacenamiento del navegador.",
    saveError:
      "No se pudo guardar. Mantén esta página abierta y revisa el almacenamiento.",
    version: {
      builtin: "de la app",
      web: (pack: string) => `Versión web · paquete ${pack}`,
      native: (native: string, pack: string) =>
        `Versión ${native} · paquete ${pack}`,
      pack: (pack: string) => `Paquete ${pack}`,
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
  es: {
    title: "¡Llegó tu desafío diario!",
    day7: (coins: number) =>
      `Hoy es el Día 7: ¡un cofre con ${coins} monedas te está esperando!`,
    streak: (streak: number, coins: number) =>
      `No pierdas tu racha de ${streak} días. Recompensa de hoy: +${coins} monedas.`,
    plain: (coins: number) =>
      `Te espera un crucigrama nuevo. Recompensa de hoy: +${coins} monedas.`,
  },
});
