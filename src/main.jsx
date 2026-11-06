import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/400.css';
import '@fontsource/archivo-black/400.css';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/700.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/800.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/lobster/400.css';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/700.css';
import './styles.css';
import './lib/kernel.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
