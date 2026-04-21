import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { router } from './router';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the PWA service worker (autoUpdate)
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
