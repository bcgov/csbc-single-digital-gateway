import { createFileRoute, useLocation } from "@tanstack/react-router";
import { SignOut } from "../../../features/auth/components/sign-out.component";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();

  return (
    <div className="flex flex-col h-dvh">
      <div className="m-auto flex flex-col gap-4">
        <h1 className="text-4xl font-extrabold">Hello, {location.href}!</h1>
        <SignOut />
      </div>
    </div>
  );
}
