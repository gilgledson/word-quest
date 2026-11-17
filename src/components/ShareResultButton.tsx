import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareText } from "../services/share";
import { track } from "../services/telemetry";

/** Botão "Compartilhar resultado" do desafio do dia (folha do Android, ou copia o texto). */
export function ShareResultButton({
  text,
  className = "button result-ghost",
  label = "Compartilhar resultado",
}: {
  text: string;
  className?: string;
  /** Texto visível; o nome para leitores de tela é sempre "Compartilhar resultado". */
  label?: string;
}) {
  const [note, setNote] = useState("");
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Compartilhar resultado"
        onClick={() => {
          track("daily_shared");
          void shareText(text, "Compartilhar resultado").then((r) =>
            setNote(
              r === "copied"
                ? "Resultado copiado! É só colar na conversa."
                : "",
            ),
          );
        }}
      >
        <Share2 size={18} aria-hidden="true" /> {label}
      </button>
      {note && (
        <p className="share-note" role="status">
          {note}
        </p>
      )}
    </>
  );
}
