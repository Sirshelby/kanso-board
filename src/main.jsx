import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted variable font, then global styles, so component styles can build on them.
import '@fontsource-variable/schibsted-grotesk/wght.css';
import './styles/tokens.css';
import './styles/base.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
