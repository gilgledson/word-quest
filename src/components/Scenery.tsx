import { shellT } from "../i18n/screens";

/** Shared production artwork derived from the approved WordQuest visual. */
export function Scenery() {
  return (
    <img
      className="scenery"
      src="/art/village-approved-v1.webp"
      alt={shellT.scenery}
      decoding="async"
      fetchPriority="high"
    />
  );
}
