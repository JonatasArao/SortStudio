import React, { Component, ReactNode } from 'react';
import { HomePage } from './components/pages/HomePage';
import { useAppInitialization } from './hooks/useAppInitialization';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#14151a] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 text-2xl font-black">
              ⚠️
            </div>
            <h1 className="text-xl font-black mb-2">Ops! Algo deu errado</h1>
            <p className="text-xs text-slate-400 mb-6">
              Ocorreu um erro ao carregar a interface. Clique abaixo para reiniciar ou restaurar os dados padrão.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20"
              >
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                    indexedDB.deleteDatabase('keyval-store');
                  } catch (e) {}
                  window.location.reload();
                }}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all"
                title="Limpa cache e dados locais corrompidos"
              >
                Limpar Dados & Reiniciar
              </button>
            </div>
            {this.state.error && (
              <details className="mt-4 text-left w-full text-[10px] text-slate-500 bg-slate-950 p-2.5 rounded-lg overflow-auto max-h-36">
                <summary className="cursor-pointer font-mono font-bold text-slate-400">Ver detalhes do erro</summary>
                <pre className="mt-1 whitespace-pre-wrap font-mono">{this.state.error.message}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  useAppInitialization();

  return (
    <ErrorBoundary>
      <HomePage />
    </ErrorBoundary>
  );
}

