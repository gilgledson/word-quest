import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Slide, ToastContainer, toast } from "react-toastify";
import { Swords } from "lucide-react";

const TOAST_ID = "partida-em-andamento";

/**
 * Aviso de duelo ao vivo em andamento (o jogador saiu da sala sem querer): fica no topo das telas
 * fora da partida, com "Voltar". Fechado pelo X, só volta a aparecer para outra partida.
 */
export function ResumeMatchToast({
  code,
  visible,
}: {
  code: string | undefined;
  visible: boolean;
}) {
  const closedFor = useRef<string | undefined>(undefined);
  const leaving = useRef(false);
  useEffect(() => {
    const show = !!code && visible && closedFor.current !== code;
    if (!show) {
      leaving.current = true;
      toast.dismiss(TOAST_ID);
      return;
    }
    leaving.current = false;
    if (toast.isActive(TOAST_ID)) return;
    toast(
      <div className="resume-toast">
        <Swords size={20} aria-hidden="true" />
        <span>
          Partida em andamento <b>{code}</b>
        </span>
        <Link
          to={`/online/${code}`}
          aria-label={`Voltar para a partida ${code}`}
          onClick={() => {
            leaving.current = true;
            toast.dismiss(TOAST_ID);
          }}
        >
          Voltar
        </Link>
      </div>,
      {
        toastId: TOAST_ID,
        autoClose: false,
        closeOnClick: false,
        draggable: true,
        // Fechado no X (não por sair da tela ou entrar na partida): não insiste nesta partida.
        onClose: () => {
          if (!leaving.current) closedFor.current = code;
        },
      },
    );
  }, [code, visible]);
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
