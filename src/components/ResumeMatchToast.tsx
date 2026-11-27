import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Slide, ToastContainer, toast } from "react-toastify";
import { Swords } from "lucide-react";
import { onlineText as T } from "../i18n/online";

const TOAST_ID = "partida-em-andamento";

/**
 * Aviso de duelo ao vivo em andamento (o jogador saiu da sala sem querer): fica no topo das telas
 * fora da partida, com "Voltar". Fechado pelo X, só volta a aparecer para outra partida.
 */
export function ResumeMatchToast({
  code,
  visible,
  onEnd,
  id = TOAST_ID,
  title = T.inProgress,
  detail,
  action = T.back,
}: {
  code: string | undefined;
  visible: boolean;
  /** Encerra a partida (o jogador confirma antes). Sem isto, o aviso só oferece voltar. */
  onEnd?: (code: string) => void;
  /** Aviso próprio (ex.: "Sua vez!"), que convive com o de partida em andamento. */
  id?: string;
  title?: string;
  /** Segunda linha; sem ela, o código da sala. */
  detail?: string;
  /** Texto do botão que abre a partida. */
  action?: string;
}) {
  const closedFor = useRef<string | undefined>(undefined);
  const leaving = useRef(false);
  useEffect(() => {
    const show = !!code && visible && closedFor.current !== code;
    if (!show) {
      leaving.current = true;
      toast.dismiss(id);
      return;
    }
    leaving.current = false;
    if (toast.isActive(id)) return;
    toast(
      <div className="resume-toast">
        <div className="resume-toast-text">
          <strong>{title}</strong>
          <span>
            {detail ?? (
              <>
                {T.code} <b>{code}</b>
              </>
            )}
          </span>
        </div>
        <div className="resume-toast-actions">
          <Link
            to={`/online/${code}`}
            aria-label={T.backToMatch(code)}
            onClick={() => {
              leaving.current = true;
              toast.dismiss(id);
            }}
          >
            {action}
          </Link>
          {onEnd && (
            <button
              type="button"
              className="resume-toast-end"
              aria-label={T.endMatchAria(code)}
              onClick={() => {
                if (!window.confirm(T.endConfirm(code))) return;
                leaving.current = true;
                toast.dismiss(id);
                onEnd(code);
              }}
            >
              {T.end}
            </button>
          )}
        </div>
        <span className="resume-toast-art" aria-hidden="true">
          <Swords size={24} />
        </span>
      </div>,
      {
        toastId: id,
        autoClose: false,
        closeOnClick: false,
        draggable: true,
        // Fechado no X (não por sair da tela ou entrar na partida): não insiste nesta partida.
        onClose: () => {
          if (!leaving.current) closedFor.current = code;
        },
      },
    );
  }, [code, visible, onEnd, id, title, detail, action]);
  return null;
}

/** Onde os avisos aparecem: fora do layout das telas (que é grade/flex), acima de tudo. */
export function Toasts() {
  return (
    <ToastContainer
      position="top-center"
      transition={Slide}
      hideProgressBar
      newestOnTop
      limit={3}
      className="wq-toasts"
    />
  );
}
