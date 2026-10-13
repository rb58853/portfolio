import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { router } from './routes/routes.js';
import { RouterProvider } from 'react-router-dom';
import { PreferencesProvider } from './preferences/preferencesContext.jsx';

// Images and links cannot be dragged out of the page (CSS alone does not cover Firefox).
document.addEventListener('dragstart', (event) => event.preventDefault());

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PreferencesProvider>
      <RouterProvider router={router} />
    </PreferencesProvider>
  </React.StrictMode>
);