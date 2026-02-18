import { Helmet, HelmetProvider } from "@dr.pogodin/react-helmet";
import { Spinner, Toaster } from "@repo/ui";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "react-oidc-context";
import { authProviderProps } from "../lib/react-oidc-context.config";
import { queryClient } from "../lib/react-query.client";
import { router } from "./router";

const InnerAppProvider = () => {
  const auth = useAuth();

  return (
    <>
      <Helmet
        defaultTitle={import.meta.env.VITE_APP_NAME}
        titleTemplate={`%s | ${import.meta.env.VITE_APP_NAME}`}
      />
      {auth.isLoading &&
      ["/app", "/callback"].some((prefix) =>
        window.location.pathname.startsWith(prefix)
      ) ? (
        <div className="flex flex-col h-dvh">
          <div className="m-auto">
            <Spinner className="size-8" />
          </div>
        </div>
      ) : (
        <RouterProvider context={{ auth }} router={router} />
      )}
    </>
  );
};

export const AppProvider = () => {
  return (
    <HelmetProvider>
      <AuthProvider {...authProviderProps}>
        <QueryClientProvider client={queryClient}>
          <InnerAppProvider />
        </QueryClientProvider>
        <Toaster position="top-right" />
      </AuthProvider>
    </HelmetProvider>
  );
};

