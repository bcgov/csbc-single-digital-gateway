import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { GeoDataProvider } from '@repo/react/jsonforms-renderers';
import iconUrl from '@repo/ui/icon.svg';
import { appGeoData } from './lib/geo';
import { router } from './router';
import './styles.css';

// Use the shared @repo/ui brand icon as the favicon (single source of truth).
const favicon =
  document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
  document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
favicon.type = 'image/svg+xml';
favicon.href = iconUrl;

// `refetchOnWindowFocus` off + retries capped at 1: the defaults bursted concurrent credentialed
// BFF requests on tab refocus, stampeding the server token-refresh window into flaky 401s (bug
// 23-B1). Data still refetches on mount, navigation, and staleness.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GeoDataProvider value={appGeoData}>
        <RouterProvider router={router} />
      </GeoDataProvider>
    </QueryClientProvider>
  </StrictMode>,
);
