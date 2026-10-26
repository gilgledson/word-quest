/** Três pontinhos pulando enquanto o oponente "pensa" (só CSS; some quando o turno acaba). */
export function TurnThinkingEffect() {
  return (
    <span className="fx-dots" aria-hidden="true" data-testid="fx-dots">
      <i />
      <i />
      <i />
    </span>
  );
}
