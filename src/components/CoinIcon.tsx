/** Moeda dourada do jogo (substitui o ícone de linha para combinar com a arte). */
export function CoinIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#f0a500" />
      <circle cx="12" cy="11.4" r="10" fill="#ffd34e" />
      <circle
        cx="12"
        cy="11.4"
        r="7.2"
        fill="none"
        stroke="#e29a00"
        strokeWidth="1.6"
      />
      <path d="M12.6 6.8h-1.7l-1.7 2.2v1.4h2.3v3.3h1.1z" fill="#c77d00" />
    </svg>
  );
}
