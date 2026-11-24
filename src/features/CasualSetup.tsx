import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Dices, Swords } from "lucide-react";
import {
  casualThemes,
  freeCasualId,
  levels,
  variantCount,
} from "../data/catalog";
import { avatarOf } from "../game/avatars";
import { BOARD_SIZES, DEFAULT_BOARD, type BoardSize } from "../game/online";
import { OPPONENTS, randomOpponent } from "../game/opponents";
import { OPPONENT_LEVELS } from "../game/opponent";
import { OpponentAvatar } from "../components/OpponentAvatar";
import { usePlayer } from "../stores/player";
import { track } from "../services/telemetry";
import { BoardSizePicker } from "./BoardSizePicker";
import { casualT as t } from "../i18n/screens";

/** Opção "Sorteio" na escolha do adversário. */
const SURPRISE_RIVAL = "sorteio";

/**
 * Configuração da partida casual contra um rival do jogo: tamanho do tabuleiro e adversário (a tela
 * do duelo ao vivo, sem aposta nem tempo por jogada). Se o tema tiver grades do tamanho, a partida
 * é do tema; senão, uma grade da Aventura daquele tamanho, jogada como partida livre (sem progresso
 * de fase). Os temas têm grades em todos os tamanhos (6×6 a 8×8), então a partida fica no tema.
 */
export function CasualSetup() {
  const player = usePlayer((s) => s.player);
  const update = usePlayer((s) => s.update);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const theme = casualThemes.find((t) => t.id === search.get("tema"));
  // Adversário escolhido pelo jogador (id de OPPONENTS); "Sorteio" sorteia ao começar.
  const [rivalId, setRivalId] = useState<string>(SURPRISE_RIVAL);
  const rival = OPPONENTS.find((o) => o.id === rivalId);
  const [board, setBoard] = useState<BoardSize>(DEFAULT_BOARD);
  if (!theme) return <Navigate to="/casual" replace />;
  const size = BOARD_SIZES.find((s) => s.id === board)!;
  // As partidas do casual têm oponente variável: vale qualquer sessão da grade.
  const keysOf = (id: string) =>
    Object.keys(player.sessions).filter((k) => k.startsWith(`vs:${id}:`));
  const done = (id: string) =>
    keysOf(id).some((k) => player.sessions[k].claimed);
  const themed = theme.puzzles.filter(
    (p) => p.cols === size.cols && p.rows === size.rows,
  );
  const start = () => {
    const ids = themed.length
      ? themed.map((p) => p.id)
      : levels
          .filter((l) => l.cols === size.cols && l.rows === size.rows)
          .flatMap((l) =>
            Array.from({ length: variantCount(l.id) }, (_, v) =>
              freeCasualId(l.id, v),
            ),
          );
    const open = ids.filter((id) => !done(id));
    const pool = open.length ? open : ids;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // Grade já jogada até o fim: recomeça do zero (a recompensa só vale na primeira vez).
    if (!open.length)
      update((q) => {
        const sessions = { ...q.sessions };
        for (const k of keysOf(pick)) delete sessions[k];
        return { ...q, sessions };
      });
    const vs = rival ?? randomOpponent();
    track("casual_setup", {
      theme: theme.id,
      board,
      opponent: rival ? rival.id : SURPRISE_RIVAL,
    });
    navigate(`/play/${pick}?vs=${vs.id}`);
  };
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1>{t.setupTitle}</h1>
      </div>
      <section className="online-card online-setup" aria-label={t.setupTitle}>
        <div className="online-versus" aria-hidden="true">
          <span>
            <OpponentAvatar opponent={avatarOf(player.avatar)} size={60} />
            <b>{player.name.trim() || t.you}</b>
          </span>
          <i>VS</i>
          <span>
            {rival ? <OpponentAvatar opponent={rival} size={60} /> : <em>?</em>}
            <b>{rival?.name ?? t.random}</b>
          </span>
        </div>
        <p className="online-setup-theme">
          {/* Sem grade do tema no tamanho (conteúdo antigo), a partida é Surpresa. */}
          {t.theme} <b>{themed.length ? theme.nome : t.surprise}</b> ·{" "}
          <Link to="/casual">{t.change}</Link>
        </p>
        <BoardSizePicker value={board} onChange={setBoard} />
        <h2 id="escolha-rival">{t.rival}</h2>
        <div
          className="rival-picks"
          role="radiogroup"
          aria-labelledby="escolha-rival"
        >
          <button
            type="button"
            role="radio"
            aria-checked={!rival}
            aria-label={t.randomLabel}
            className={!rival ? "selected" : ""}
            onClick={() => setRivalId(SURPRISE_RIVAL)}
          >
            <span className="rival-pick-face" aria-hidden="true">
              <Dices size={26} />
            </span>
            <b>{t.random}</b>
            <small className="rival-pick-level">{t.any}</small>
          </button>
          {OPPONENTS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={rivalId === o.id}
              aria-label={`${o.name}, ${OPPONENT_LEVELS[o.level].label}`}
              className={rivalId === o.id ? "selected" : ""}
              onClick={() => setRivalId(o.id)}
            >
              <OpponentAvatar opponent={o} size={48} />
              <b>{o.name}</b>
              <small className={`rival-pick-level ${o.level}`}>
                {OPPONENT_LEVELS[o.level].label}
              </small>
            </button>
          ))}
        </div>
        <p className="online-hint">
          {rival ? t.against(rival.name) : t.randomHint}
        </p>
        <button type="button" className="button primary" onClick={start}>
          <Swords size={20} aria-hidden="true" /> {t.start}
        </button>
      </section>
    </>
  );
}
