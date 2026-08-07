// Silence THREE.Clock deprecation warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('THREE.Clock: This module has been deprecated') ||
     args[0].includes('Clock: This module has been deprecated'))
  ) {
    return;
  }
  originalWarn(...args);
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
