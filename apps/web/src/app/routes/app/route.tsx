import {
  createFileRoute,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/app")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      sessionStorage.setItem("auth.next", location.href);

      throw redirect({
        replace: true,
        to: "/",
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate({ from: "/app" });

  useEffect(() => {
    const handleAccessTokenExpired = () => navigate({ to: "/" });
    const handleUserSignedOut = () => navigate({ to: "/" });

    auth.events.addAccessTokenExpired(handleAccessTokenExpired);
    auth.events.addUserSignedOut(handleUserSignedOut);

    return () => {
      auth.events.removeAccessTokenExpired(handleAccessTokenExpired);
      auth.events.removeUserSignedOut(handleUserSignedOut);
    };
  }, [navigate, auth, location]);

  return <Outlet />;
}
