import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProfileProvider } from './state/ProfileContext.jsx';
import { DIMENSIONS, MAP_BG } from './data/dimensions.js';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/nova.css';
import './styles/home.css';
import './styles/quiz.css';
import './styles/results.css';

// Blaze colours live in one place (data/dimensions.js); expose them to CSS.
const root = document.documentElement;
root.style.setProperty('--paper', MAP_BG);
for (const d of DIMENSIONS) root.style.setProperty(`--blaze-${d.id}`, d.color);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
