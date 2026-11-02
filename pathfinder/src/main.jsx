import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import App from './App.jsx';
import { ProfileProvider } from './state/ProfileContext.jsx';
import { DIMENSIONS } from './data/dimensions.js';
import { SURFACES, TYPE_COLORS } from './data/palette.js';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/nova.css';
import './styles/shared.css';
import './styles/map.css';
import './styles/home.css';
import './styles/quiz.css';
import './styles/results.css';
import './styles/explore.css';
import './styles/profile.css';
import './styles/chat.css';

// Colours live in one place and are exposed to CSS from here.
const root = document.documentElement;
root.style.setProperty('--bg', SURFACES.paper);
for (const [t, c] of Object.entries(TYPE_COLORS)) {
  root.style.setProperty(`--${t.toLowerCase()}`, c.dark);
  root.style.setProperty(`--${t.toLowerCase()}-lt`, c.light);
}
// The previous 8-dimension model still drives the quiz and results until the data
// model is replaced; its markers keep their colours meanwhile.
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
