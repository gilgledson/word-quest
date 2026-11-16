/** A rota é de uma partida (da Aventura, do Casual, do Diário ou de uma sala ao vivo)? */
export const isPlayPath = (pathname: string) =>
  pathname.startsWith("/play/") || /^\/online\/.+/.test(pathname);
