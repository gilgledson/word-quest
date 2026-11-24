import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareText } from "../services/share";
import { track } from "../services/telemetry";
import { shareUiText as t } from "../i18n/result";

/** Botão "Compartilhar resultado" do desafio do dia (folha do Android, ou copia o texto). */
export function ShareResultButton({
  text,
  className = "button result-ghost",
  label = t.shareResult,
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
        aria-label={t.shareResult}
        onClick={() => {
          track("daily_shared");
          void shareText(text, t.shareResult).then((r) =>
            setNote(r === "copied" ? t.copied : ""),
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
