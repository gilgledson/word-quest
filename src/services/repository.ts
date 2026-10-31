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
  /** O tour de apresentação da fase 1 (grade, letras, botões, placar) já foi visto ou dispensado. */
  tourDone: boolean;
  /** A apresentação do curinga (primeira vez que ele chega ao banco) já foi vista. */
  jokerTourDone: boolean;
  /** Baús da tela inicial já abertos (um a cada 5 vitórias). */
  chestsOpened: number;
}
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
  jokerTourDone: false,
  chestsOpened: 0,
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
