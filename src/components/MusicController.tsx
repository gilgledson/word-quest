import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePlayer } from "../stores/player";
import { setMusic } from "../services/music";

/** A música toca fora das partidas: no tabuleiro fica em silêncio, mesmo ligada. */
export function MusicController() {
  const music = usePlayer((s) => s.player.music);
  const { pathname } = useLocation();
  useEffect(() => {
    setMusic(music && !pathname.startsWith("/play/"));
  }, [music, pathname]);
  return null;
}
