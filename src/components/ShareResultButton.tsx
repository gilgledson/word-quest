import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareText } from "../services/share";
import { track } from "../services/telemetry";

/** Botão "Compartilhar resultado" do desafio do dia (folha do Android, ou copia o texto). */
export function ShareResultButton({
  text,
  className = "button result-ghost",
}: {
  text: string;
  className?: string;
}) {
  const [note, setNote] = useState("");
  return (
    <>
      <button
        type="button"
        className={className}
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
        <Share2 size={18} aria-hidden="true" /> Compartilhar resultado
      </button>
      {note && (
        <p className="share-note" role="status">
          {note}
        </p>
      )}
    </>
  );
}
