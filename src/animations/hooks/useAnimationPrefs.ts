import { useEffect, useState } from "react";
import { usePlayer } from "../../stores/player";

/**
 * `enabled`: opção Animações do Perfil. `reduced`: o sistema pede menos movimento; os efeitos
 * viram um flash curto, sem trajetórias nem partículas.
 */
export function useAnimationPrefs() {
  const enabled = usePlayer((s) => s.player.animations);
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === "function" && matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const media = matchMedia(query);
    const onChange = () => setReduced(media.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);
  return { enabled, reduced };
}
