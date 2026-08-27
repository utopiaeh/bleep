import { useErrorLogStore } from '../store/errorLog';

let installed = false;

function messageFrom(value: unknown): string {
  if (value instanceof Error) return value.message;
  try {
    return String(value);
  } catch {
    return 'Unknown error';
  }
}

export function installGlobalErrorLogging(): void {
  if (installed) return;
  installed = true;

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);
    useErrorLogStore.getState().logError(args.map(messageFrom).join(' '));
  };

  globalThis.addEventListener?.('error', (event) => {
    useErrorLogStore.getState().logError(messageFrom(event.error ?? event.message));
  });

  globalThis.addEventListener?.('unhandledrejection', (event) => {
    useErrorLogStore.getState().logError(messageFrom(event.reason));
  });
}
