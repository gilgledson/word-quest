import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { levels, maps, worldLevels, type WorldMapInfo } from "../data/catalog";
import type { Puzzle } from "../game/crossword-engine";
import { wordsFoundCount } from "../game/chest";
import { usePlayer } from "../stores/player";
import { ChestHint, HomeChest } from "./HomeChest";

export type StepState = "done" | "current" | "pending";
export interface WorldProgress {
  world: WorldMapInfo;
  /** Posição do mundo no mapa (1 = o primeiro). */
  number: number;
  /** As fases do mundo, cada uma com o estado na trilha. */
  steps: { level: Puzzle; state: StepState }[];
  /** A fase que o botão abre; `undefined` quando a Aventura inteira está vencida. */
  next?: Puzzle;
  /** Fases vencidas na Aventura toda. */
  wins: number;
  total: number;
}

/**
 * Onde o jogador está na Aventura: o mundo da primeira fase ainda não vencida e a trilha das fases
 * desse mundo (vencida, a de agora e as que faltam). Com tudo vencido, fica o último mundo completo.
 */
export function worldProgress(stars: Record<string, number>): WorldProgress {
  const next = levels.find((l) => !stars[l.id]);
  const world =
    maps.find((m) => m.id === (next ?? levels.at(-1))?.world) ?? maps[0];
  return {
    world,
    number: maps.indexOf(world) + 1,
    steps: worldLevels(world.id).map((level) => ({
      level,
      state: stars[level.id]
        ? "done"
        : level.id === next?.id
          ? "current"
          : "pending",
    })),
    next,
    wins: levels.filter((l) => stars[l.id]).length,
    total: levels.length,
  };
}

/**
 * Cena de cada mundo no card (geradas no ChatGPT no estilo da Vila: docs/referencias/mundos/). Um
 * mundo novo vindo do conteúdo, sem cena própria, usa a arte do mapa dele.
 */
const WORLD_SCENES: Record<string, { src: string; focus?: string }> = {
  // Cena própria (o fundo da tela inicial já é a Vila de village-approved-v1.webp).
  vila: { src: "/art/mundos/vila.webp", focus: "50% 42%" },
  floresta: { src: "/art/mundos/floresta.webp" },
  // Pirâmides e domos ficam mais no alto da arte: o recorte sobe para mostrá-los.
  deserto: { src: "/art/mundos/deserto.webp", focus: "50% 14%" },
  reino: { src: "/art/mundos/reino.webp", focus: "50% 12%" },
  ilhas: { src: "/art/mundos/ilhas.webp", focus: "50% 22%" },
};
export const worldArt = (w: Pick<WorldMapInfo, "id" | "art">) =>
  WORLD_SCENES[w.id] ?? { src: w.art };

/**
 * Card principal da tela inicial (referência: docs/referencias/home-redesign-chatgpt.webp): a arte do
 * mundo atual (toque abre o mapa), o nome, a trilha das fases do mundo com o baú no fim, o total da
 * Aventura e o botão que continua de onde parou.
 */
export function WorldCard() {
  const p = usePlayer((s) => s.player);
  const progress = worldProgress(p.stars);
  const { world, number, steps, next, wins, total } = progress;
  const words = wordsFoundCount(p.wordsFound);
  const art = worldArt(world);
  const position = next ? steps.findIndex((s) => s.level.id === next.id) : -1;
  // Partida da próxima fase já começada (há letras confirmadas) e ainda sem resultado.
  const started =
    !!next &&
    Object.entries(p.sessions).some(
      ([key, s]) =>
        key.startsWith(`vs:${next.id}:`) && !s.claimed && s.locked?.length > 0,
    );
  // O botão diz o que o toque faz: quem nunca jogou não tem o que "continuar".
  const action = !next
    ? "Rever o mapa"
    : started
      ? "Retomar partida"
      : wins === 0
        ? "Jogar primeira fase"
        : "Continuar aventura";
  return (
    <section className="world-card" aria-labelledby="world-card-title">
      <Link
        className="world-card-art"
        to={world.path}
        aria-label={`Ver o mapa: ${world.nome}`}
      >
        <img
          src={art.src}
          style={art.focus ? { objectPosition: art.focus } : undefined}
          alt=""
          decoding="async"
        />
      </Link>
      <div className="world-card-body">
        <span className="world-card-pill">
          <b>MUNDO {String(number).padStart(2, "0")}</b>
        </span>
        <h2 id="world-card-title">{world.nome}</h2>
        <p className="world-card-step">
          {next
            ? `Fase ${position + 1} de ${steps.length}`
            : wins === total
              ? "Aventura completa!"
              : "Mundo completo!"}
        </p>
        <ol className="world-trail" aria-label="Fases do mundo">
          {steps.map(({ level, state }, i) => (
            <li
              key={level.id}
              className={`world-step ${state}`}
              aria-current={state === "current" ? "step" : undefined}
              aria-label={`Fase ${i + 1}: ${
                state === "done"
                  ? "concluída"
                  : state === "current"
                    ? "a próxima"
                    : "ainda não"
              }`}
            >
              {state === "done" ? (
                <Check strokeWidth={4} aria-hidden="true" />
              ) : (
                <span aria-hidden="true">{i + 1}</span>
              )}
            </li>
          ))}
          <li className="world-trail-chest">
            <HomeChest words={words} />
          </li>
        </ol>
        <p className="world-card-total">
          <span>
            Aventura: {wins}/{total} fases
          </span>
          <ChestHint words={words} />
        </p>
        <Link
          className="button primary continue-button"
          to={next ? `/play/${next.id}` : (maps[0]?.path ?? "/map")}
        >
          {action} <ArrowRight size={24} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
