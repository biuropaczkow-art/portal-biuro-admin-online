import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../../app/page';
import Demo from '../../app/demo/page';
import '../../app/globals.css';

const route = window.location.pathname.replace(/\/$/, '') || '/';
const isWorkspace = route === '/demo' || route === '/auth/callback' || route.startsWith('/demo');

createRoot(document.getElementById('root')!).render(
  isWorkspace ? <Demo /> : <Home />
);
