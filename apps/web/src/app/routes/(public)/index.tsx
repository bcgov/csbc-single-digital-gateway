import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";
import { SignIn } from "../../../features/auth/components/sign-in.component";
import { SignOut } from "../../../features/auth/components/sign-out.component";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();

  return (
    <div className="flex h-dvh flex-col">
      <div className="m-auto flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold">
          Hello, {import.meta.env.VITE_APP_NAME}!
        </h1>
        <div className="flex flex-row justify-between gap-4">
          <SignIn />
          {auth.isAuthenticated && <SignOut />}
        </div>
      </div>
    </div>
  );
}
