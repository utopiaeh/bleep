import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from '../../components/ErrorBoundary.tsx';
import { installGlobalErrorLogging } from '../../utils/error-log.ts';
import App from './App.tsx';
import '../popup/style.css';

installGlobalErrorLogging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
