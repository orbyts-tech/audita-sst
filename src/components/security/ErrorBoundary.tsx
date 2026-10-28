import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/** Contém falhas de UI — evita tela em branco e vazamento de stack ao usuário. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-50 p-8 text-center">
          <h1 className="text-xl font-bold text-navy-900">Algo deu errado</h1>
          <p className="max-w-md text-sm text-ink-muted">
            A interface encontrou um erro inesperado. Tente recarregar a página.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.assign("/");
            }}
          >
            Voltar ao início
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
