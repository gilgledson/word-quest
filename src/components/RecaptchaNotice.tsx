import { currentMode } from "../services/appCheckMode";

/**
 * Aviso do reCAPTCHA na versão web. O selo flutuante do Google fica escondido (cobria a barra de
 * baixo); em troca, o Google pede este texto com os links nas telas protegidas.
 */
export function RecaptchaNotice() {
  if (currentMode() !== "recaptcha") return null;
  return (
    <p className="recaptcha-notice">
      Este site é protegido pelo reCAPTCHA, e se aplicam a{" "}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noreferrer"
      >
        Política de Privacidade
      </a>{" "}
      e os{" "}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noreferrer"
      >
        Termos de Serviço
      </a>{" "}
      do Google.
    </p>
  );
}
