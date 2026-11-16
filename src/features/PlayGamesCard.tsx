import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { Gamepad2, Medal, Trophy } from "lucide-react";
import { usePlayer } from "../stores/player";
import {
  hasLeaderboard,
  loadCloudSave,
  openPlayAchievements,
  openPlayLeaderboard,
  playGamesStatus,
  resetPlayGamesSync,
  signInPlayGames,
  syncPlayGames,
  writeCloudSave,
  type PlayGamesStatus,
} from "../services/playGames";
import {
  adoptAccount,
  cloudText,
  mergeCloud,
  parseCloud,
} from "../game/cloudSave";
import { levels } from "../data/catalog";

/** Situação do Play Games nesta sessão (configurado? jogador conectado?). */
export const usePlayGamesStatus = create<
  PlayGamesStatus & {
    /** O app já perguntou ao Play Games nesta sessão (antes disso vale a conta em cache). */
    checked?: boolean;
  }
>(() => ({
  configured: false,
  signedIn: false,
}));

/** Por quanto tempo o aviso "Conectado…" fica na tela. */
export const TOAST_MS = 4500;
/** Espera depois da última mudança antes de gravar na nuvem (junta várias jogadas num envio). */
export const CLOUD_SAVE_DELAY = 4000;

/**
 * Mantém o Play Games em dia com o progresso, em qualquer tela: consulta o login na abertura e,
 * com o jogador conectado, envia conquistas e placar a cada mudança e guarda o progresso na conta.
 * Na primeira vez da sessão, junta o que está na nuvem com o que está no aparelho. Não desenha nada.
 */
export function PlayGamesSync() {
  const player = usePlayer((s) => s.player);
  const signedIn = usePlayGamesStatus((s) => s.signedIn);
  useEffect(() => {
    void playGamesStatus().then((s) =>
      usePlayGamesStatus.setState({ ...s, checked: true }),
    );
  }, []);
  // A conta que entrou fica guardada no aparelho e, sem nome escolhido, dá o nome ao jogador.
  // Não depende da leitura da nuvem: vale mesmo sem internet ou com os Jogos salvos indisponíveis.
  const ready = usePlayer((s) => s.ready);
  const accountName = usePlayGamesStatus((s) => s.name)?.trim();
  const accountPhoto = usePlayGamesStatus((s) => s.photo);
  useEffect(() => {
    if (!ready || !signedIn || !accountName) return;
    usePlayer
      .getState()
      .update((p) =>
        adoptAccount(p, { name: accountName, photo: accountPhoto }),
      );
  }, [ready, signedIn, accountName, accountPhoto]);
  useEffect(() => {
    if (signedIn) void syncPlayGames(player);
  }, [signedIn, player]);

  // Último texto que se sabe estar na nuvem; `undefined` = ainda não leu (não grava antes disso).
  const [inCloud, setInCloud] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    void loadCloudSave().then((text) => {
      if (!alive || text === undefined) return;
      const cloud = parseCloud(text);
      if (cloud) usePlayer.getState().update((p) => mergeCloud(p, cloud));
      setInCloud(text);
    });
    return () => {
      alive = false;
      setInCloud(undefined);
    };
  }, [signedIn]);
  useEffect(() => {
    if (!signedIn || inCloud === undefined) return;
    const text = cloudText(player);
    if (text === inCloud) return;
    const timer = setTimeout(() => {
      const won = levels.filter((l) => player.stars[l.id]).length;
      void writeCloudSave(text, `${won} de ${levels.length} fases`).then(
        (ok) => {
          if (ok) setInCloud(text);
        },
      );
    }, CLOUD_SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [signedIn, player, inCloud]);

  // Avisa uma vez quando o login acontece (ele é automático e, sem isso, passa despercebido).
  const name = usePlayGamesStatus((s) => s.name);
  const [toast, setToast] = useState(false);
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (signedIn && !wasSignedIn.current) {
      setToast(true);
      const t = window.setTimeout(() => setToast(false), TOAST_MS);
      wasSignedIn.current = true;
      return () => window.clearTimeout(t);
    }
    wasSignedIn.current = signedIn;
  }, [signedIn]);
  if (!toast) return null;
  return (
    <div className="play-games-toast" role="status">
      <Gamepad2 size={18} aria-hidden="true" />
      <span>
        Conectado ao Google Play Games{name ? <b> como {name}</b> : null}
      </span>
    </div>
  );
}

async function signIn() {
  const next = await signInPlayGames();
  if (next.signedIn) resetPlayGamesSync();
  usePlayGamesStatus.setState({ ...next, checked: true });
}

/** Cartão do Perfil: só aparece no app Android com o Play Games configurado. */
export function PlayGamesCard() {
  const status = usePlayGamesStatus();
  const cached = usePlayer((s) => s.player.playGames);
  // Até o Play Games responder, vale a conta guardada no aparelho: o cartão não "pisca" deslogado.
  const pending = !status.checked && !!cached;
  if (!status.configured && !pending) return null;
  const connected = status.signedIn || pending;
  const name = status.name ?? cached?.name;
  const photo = status.photo ?? cached?.photo;
  return (
    <section className="profile-card play-games" aria-label="Google Play Games">
      <h2>
        <Gamepad2 size={20} aria-hidden="true" /> Google Play Games
      </h2>
      {connected ? (
        <>
          <div className="play-games-account">
            {photo && <img src={photo} alt="" width={44} height={44} />}
            <p>
              Conectado{name ? " como " : ""}
              {name && <b>{name}</b>}.
              <br />
              Seu progresso fica guardado na sua conta Google.
            </p>
          </div>
          <div className="play-games-actions">
            <button
              type="button"
              disabled={!status.signedIn}
              onClick={() => void openPlayAchievements()}
            >
              <Medal size={18} aria-hidden="true" /> Conquistas
            </button>
            {hasLeaderboard() && (
              <button
                type="button"
                disabled={!status.signedIn}
                onClick={() => void openPlayLeaderboard()}
              >
                <Trophy size={18} aria-hidden="true" /> Placar
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            {cached
              ? `Você saiu da conta ${cached.name}. Entre de novo para guardar seu progresso na sua conta.`
              : "Entre com o Google Play Games para guardar seu progresso na sua conta e aparecer no placar."}
          </p>
          <div className="play-games-actions">
            <button type="button" onClick={() => void signIn()}>
              Entrar
            </button>
          </div>
        </>
      )}
    </section>
  );
}
