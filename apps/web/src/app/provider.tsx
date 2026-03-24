import { Helmet, HelmetProvider } from "@dr.pogodin/react-helmet";
import { Spinner, Toaster } from "@repo/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import {
  AuthProvider,
  useBcscAuth,
  useIdirAuth,
} from "../features/auth/auth.context";
import { queryClient } from "../lib/react-query.client";
import { router } from "./router";

const isAdminPath = window.location.pathname.startsWith("/admin");

const InnerAppProvider = () => {
  const bcscAuth = useBcscAuth();
  const idirAuth = useIdirAuth();

  const showSpinner = isAdminPath
    ? idirAuth.isLoading
    : bcscAuth.isLoading && window.location.pathname.startsWith("/app");

  return (
    <>
      <Helmet
        defaultTitle={import.meta.env.VITE_APP_NAME}
        titleTemplate={`%s | ${import.meta.env.VITE_APP_NAME}`}
      />
      {showSpinner ? (
        <div className="flex flex-col h-dvh">
          <div className="m-auto">
            <Spinner className="size-8" />
          </div>
        </div>
      ) : (
        <RouterProvider context={{ bcscAuth, idirAuth }} router={router} />
      )}
    </>
  );
};

export const AppProvider = () => {
  return (
    <HelmetProvider>
      <AuthProvider
        idpType="bcsc"
        defaultRedirectPath="/app"
        lazy={isAdminPath}
      >
        <AuthProvider
          idpType="idir"
          defaultRedirectPath="/admin"
          lazy={!isAdminPath}
        >
          <QueryClientProvider client={queryClient}>
            <InnerAppProvider />
          </QueryClientProvider>
          <Toaster position="top-right" />
        </AuthProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};
