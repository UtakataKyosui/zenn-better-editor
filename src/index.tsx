import React from 'react';
import ReactDOM from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import App from './App';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  const app = (
    <TooltipProvider>
      <App />
    </TooltipProvider>
  );
  root.render(
    import.meta.env.DEV ? app : <React.StrictMode>{app}</React.StrictMode>,
  );
}
