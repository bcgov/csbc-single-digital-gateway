import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import iconUrl from '@repo/ui/icon.svg';
import { router } from './router';
import './styles.css';

// Use the shared @repo/ui brand icon as the favicon (single source of truth).
const favicon =
  document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
  document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
favicon.type = 'image/svg+xml';
favicon.href = iconUrl;

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
