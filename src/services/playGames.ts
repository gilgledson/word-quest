/**
 * Serviços do Google Play Games (só no app Android): login, conquistas e placar. No navegador, ou
 * enquanto o projeto do Play Games não estiver configurado, nada é chamado e o jogo segue igual.
 * As conquistas continuam sendo calculadas pelo jogo (src/game/achievements.ts); aqui elas são só
 * espelhadas no Play Games.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { achievedIds } from "../game/achievements";
import { wordsFoundCount } from "../game/chest";
import {
  PLAY_ACHIEVEMENTS,
  PLAY_LEADERBOARD_WORDS,
} from "../game/playGamesIds";
import type { Player } from "./repository";

export interface PlayGamesStatus {
  /** O projeto do Play Games está configurado neste build. */
  configured: boolean;
  /** O jogador está conectado ao Play Games. */
  signedIn: boolean;
  /** Nome do perfil do Play Games (só conectado). */
  name?: string;
  /** Foto do perfil do Play Games, como imagem embutida (só conectado e se houver). */
  photo?: string;
}
interface PlayGamesPlugin {
  status(): Promise<PlayGamesStatus>;
  signIn(): Promise<PlayGamesStatus>;
  unlock(options: { ids: string[] }): Promise<void>;
  submitScore(options: { leaderboard: string; score: number }): Promise<void>;
  showAchievements(): Promise<void>;
  showLeaderboard(options: { leaderboard: string }): Promise<void>;
  loadSave(): Promise<{ data: string }>;
  writeSave(options: { data: string; description: string }): Promise<void>;
}
const PlayGames = registerPlugin<PlayGamesPlugin>("PlayGames");
const OFF: PlayGamesStatus = { configured: false, signedIn: false };

/** O placar de palavras existe no Play Console. */
export const hasLeaderboard = () => PLAY_LEADERBOARD_WORDS !== "";

export async function playGamesStatus(): Promise<PlayGamesStatus> {
  if (!Capacitor.isNativePlatform()) return OFF;
  try {
    return await PlayGames.status();
  } catch {
    return OFF;
  }
}
export async function signInPlayGames(): Promise<PlayGamesStatus> {
  if (!Capacitor.isNativePlatform()) return OFF;
  try {
    return await PlayGames.signIn();
  } catch {
    return OFF;
  }
}
export const openPlayAchievements = () =>
  PlayGames.showAchievements().catch(() => {});
export const openPlayLeaderboard = () =>
  PlayGames.showLeaderboard({ leaderboard: PLAY_LEADERBOARD_WORDS }).catch(
    () => {},
  );

/**
 * Lê o progresso guardado na conta. Devolve "" quando ainda não há nada salvo e `undefined`
 * quando a leitura falhou (sem rede, Jogos salvos desligado): nesse caso não se grava nada, para
 * um aparelho novo nunca passar por cima do que está na nuvem.
 */
export async function loadCloudSave(): Promise<string | undefined> {
  try {
    return (await PlayGames.loadSave()).data ?? "";
  } catch {
    return undefined;
  }
}
/** Grava o progresso na conta. Devolve se deu certo. */
export async function writeCloudSave(data: string, description: string) {
  try {
    await PlayGames.writeSave({ data, description });
    return true;
  } catch {
    return false;
  }
}

/** O que este jogador tem para espelhar no Play Games: ids de lá e pontuação do placar. */
export function playGamesSnapshot(p: Player) {
  return {
    ids: achievedIds(p)
      .map((id) => PLAY_ACHIEVEMENTS[id])
      .filter(Boolean),
    words: wordsFoundCount(p.wordsFound),
  };
}

let sentIds = new Set<string>();
let sentWords = -1;
/** Esquece o que já foi enviado (para reenviar tudo depois de um novo login). */
export function resetPlayGamesSync() {
  sentIds = new Set();
  sentWords = -1;
}
/**
 * Envia ao Play Games só o que mudou desde o último envio: conquistas novas e, se cresceu, o total
 * de palavras. Falha de rede não quebra nada: o que não foi enviado sai na próxima mudança.
 */
export async function syncPlayGames(p: Player) {
  const { ids, words } = playGamesSnapshot(p);
  const fresh = ids.filter((id) => !sentIds.has(id));
  if (fresh.length) {
    try {
      await PlayGames.unlock({ ids: fresh });
      fresh.forEach((id) => sentIds.add(id));
    } catch {
      /* Tenta de novo na próxima mudança do progresso. */
    }
  }
  if (hasLeaderboard() && words > sentWords && words > 0) {
    try {
      await PlayGames.submitScore({
        leaderboard: PLAY_LEADERBOARD_WORDS,
        score: words,
      });
      sentWords = words;
    } catch {
      /* Idem. */
    }
  }
}
