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
  /** Grade em alto contraste: pistas escuras com texto branco, linhas e letras mais fortes. */
  highContrast: boolean;
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
  /** Grade em uso em cada fase (índice da variante); ausente = a original. Muda a cada revanche. */
  variants?: Record<string, number>;
  /** Últimas partidas concluídas (a mais recente primeiro). */
  history: GameRecord[];
  /** Conquistas já resgatadas (ids de `ACHIEVEMENTS`). */
  achievements: string[];
  /** Vitórias sem nenhuma letra errada (alimenta a conquista "Mão certeira"). */
  cleanWins: number;
  /**
   * Última conta do Play Games que entrou neste aparelho (nome e foto). Fica só aqui, como cache:
   * o Perfil mostra a conta na hora, sem esperar o login automático nem depender de internet.
   */
  playGames?: PlayAccount;
}
export interface PlayAccount {
  name: string;
  /** Foto do perfil como imagem embutida (data URL), quando a conta tem uma. */
  photo?: string;
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
  highContrast: false,
  turnTimer: false,
  tutorialDone: false,
  tourDone: false,
  tipsSeen: [],
  jokerTourDone: false,
  chestsOpened: 0,
  wordsFound: {},
  history: [],
  achievements: [],
  cleanWins: 0,
};
export interface PlayerRepository {
  load(): Promise<Player | undefined>;
  save(player: Player): Promise<void>;
}
/** Conteúdo baixado (fases, rivais, mundos), guardado inteiro para valer nas próximas aberturas. */
export interface StoredContent {
  id: "content";
  data: unknown;
}
/** Imagem baixada do servidor de conteúdo; a chave é o endereço (cada versão tem o seu). */
export interface StoredAsset {
  url: string;
  blob: Blob;
  savedAt: number;
}
class Database extends Dexie {
  players!: Table<{ id: string; data: Player }, string>;
  content!: Table<StoredContent, string>;
  assets!: Table<StoredAsset, string>;
  constructor() {
    super("wordquest");
    this.version(1).stores({ players: "id" });
    this.version(2).stores({ players: "id", content: "id", assets: "url" });
  }
}
const db = new Database();
/** Cache do conteúdo baixado e das imagens dele (src/content). */
export const contentStore = {
  async load() {
    return (await db.content.get("content"))?.data;
  },
  async save(data: unknown) {
    await db.content.put({ id: "content", data });
  },
  async asset(url: string) {
    return (await db.assets.get(url))?.blob;
  },
  async saveAsset(url: string, blob: Blob) {
    await db.assets.put({ url, blob, savedAt: Date.now() });
  },
  /** Apaga as imagens que o conteúdo em uso não cita mais. */
  async pruneAssets(keep: Set<string>) {
    const urls = (await db.assets.toCollection().primaryKeys()) as string[];
    await db.assets.bulkDelete(urls.filter((u) => !keep.has(u)));
  },
};
export const repository: PlayerRepository = {
  async load() {
    return (await db.players.get("local"))?.data;
  },
  async save(data) {
    await db.players.put({ id: "local", data });
  },
};
