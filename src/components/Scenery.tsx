import { shellT } from "../i18n/screens";

/**
 * Shared production artwork derived from the approved WordQuest visual. Na partida, o tabuleiro
 * comprado (game/boards) pode trocar o cenário pelo do tema (`src`).
 */
export function Scenery({ src }: { src?: string }) {
  return (
    <img
      className="scenery"
      src={src ?? "/art/village-approved-v1.webp"}
      alt={shellT.scenery}
      decoding="async"
      fetchPriority="high"
    />
  );
}
