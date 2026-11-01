import Dexie, { type Table } from "dexie";
import type { BotLevel, Session } from "../game/crossword-engine";
export interface Player {
  name: string;
  /** Id de `PLAYER_AVATARS`. */
  avatar: string;
  coins: number;
  stars: Record<string, number>;
  sessions: Record<string, Session>;
  daily: string[];
  /** Resultado da primeira conclusão de cada duelo (chave da sessão versus). */
  duels: Record<string, "win" | "draw" | "loss">;
  /** Dificuldade do oponente nas partidas da aventura e do diário. */
  botLevel: BotLevel;
  /** Oponente escolhido (id de `OPPONENTS`); o nível acima acompanha a escolha. */
  opponent: string;
  sound: boolean;
  /** O jogador já mexeu na opção de sons; antes disso o padrão (ligado) vale. */
  soundChosen: boolean;
  /** Música de fundo (padrão: ligada). */
  music: boolean;
  /** Vibração ao jogar (padrão: ligada). */
  vibration: boolean;
  animations: boolean;
  /** Relógio de 25 s no turno do jogador (padrão: desligado). */
  turnTimer: boolean;
  /** O tutorial da fase 1 já foi concluído ou pulado. */
  tutorialDone: boolean;
  /** As dicas da fase 1 foram dispensadas ("Dispensar") ou todas já vistas. */
  tourDone: boolean;
  /** Dicas da fase 1 já vistas, por id (cada uma aparece quando a mecânica surge). */
  tipsSeen: string[];
  /** A apresentação do curinga (primeira vez que ele chega ao banco) já foi vista. */
  jokerTourDone: boolean;
  /** Baús da tela inicial já abertos (um a cada 5 vitórias). */
  chestsOpened: number;
  /** Palavras descobertas pelo jogador em cada fase (ids); a fase refeita não conta de novo. */
  wordsFound: Record<string, string[]>;
  /** Últimas partidas concluídas (a mais recente primeiro). */
  history: GameRecord[];
}
export interface GameRecord {
  puzzleId: string;
  /** Id do oponente (`OPPONENTS`), quando a partida o registrou. */
  opponent?: string;
  result: "win" | "draw" | "loss";
  p: number;
  ai: number;
  date: string;
}
export const HISTORY_MAX = 10;
export const initialPlayer: Player = {
  name: "Explorador",
  avatar: "jogador",
  coins: 100,
  stars: {},
  sessions: {},
  daily: [],
  duels: {},
  botLevel: "medio",
  opponent: "sabi",
  sound: true,
  soundChosen: false,
  music: true,
  vibration: true,
  animations: true,
  turnTimer: false,
  tutorialDone: false,
  tourDone: false,
  tipsSeen: [],
  jokerTourDone: false,
  chestsOpened: 0,
  wordsFound: {},
  history: [],
};
export interface PlayerRepository {
  load(): Promise<Player | undefined>;
  save(player: Player): Promise<void>;
}
class Database extends Dexie {
  players!: Table<{ id: string; data: Player }, string>;
  constructor() {
    super("wordquest");
    this.version(1).stores({ players: "id" });
  }
}
const db = new Database();
export const repository: PlayerRepository = {
  async load() {
    return (await db.players.get("local"))?.data;
  },
  async save(data) {
    await db.players.put({ id: "local", data });
  },
};
