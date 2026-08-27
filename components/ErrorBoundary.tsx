import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useSettingsStore } from '../store/settings';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Bleep UI crashed:', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex flex-col gap-3 p-4 text-sm">
        <p className="font-medium text-red-600 dark:text-red-400">Something went wrong.</p>
        <p className="text-gray-500 dark:text-gray-400">{this.state.error.message}</p>
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
          onClick={() => {
            useSettingsStore.getState().resetSettings();
            window.location.reload();
          }}
        >
          Reset settings and reload
        </button>
      </div>
    );
  }
}
