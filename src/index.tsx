import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  const app = <App />;
  root.render(import.meta.env.DEV ? app : <React.StrictMode>{app}</React.StrictMode>);
}
