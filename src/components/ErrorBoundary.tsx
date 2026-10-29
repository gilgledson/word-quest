import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Muda quando o jogador navega: assim um erro numa tela não trava as outras. */
  resetKey?: string;
}
interface State {
  failed: boolean;
  /** Última `resetKey` vista: quando ela muda, o erro é esquecido. */
  key?: string;
}
/**
 * Evita a tela em branco quando algo quebra ao renderizar: mostra uma mensagem calma, garante
 * que o progresso está salvo (ele vive no IndexedDB, não na tela) e deixa tentar de novo.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: Props, state: State) {
    return props.resetKey === state.key
      ? null
      : { failed: false, key: props.resetKey };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro de renderização", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="error-screen" role="alert">
        <img className="loading-icon" src="/icon-192.png" alt="" />
        <h1>Ops, algo deu errado</h1>
        <p>Seu progresso está salvo neste dispositivo. Tente de novo.</p>
        <div className="error-actions">
          <button
            className="button primary"
            onClick={() => this.setState({ failed: false })}
          >
            Tentar de novo
          </button>
          <button
            className="text-link"
            onClick={() => window.location.assign("/")}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }
}
