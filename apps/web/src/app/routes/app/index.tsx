import { Skeleton } from "@repo/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "react-oidc-context";

export const Route = createFileRoute("/app/")({
  component: RouteComponent,
});

function RouteComponent() {
  const auth = useAuth();

  console.log("auth.user.profile: ", auth.user?.profile);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        Hello, {auth.user?.profile.given_name}
      </h1>
      <Skeleton className="h-30 rounded-xl" />
      <Skeleton className="h-60 rounded-xl" />
      <Skeleton className="h-10 rounded-xl" />
      <div className="flex flex-row gap-4 overflow-x-auto">
        <div className="flex flex-col space-y-3 w-1/3">
          <Skeleton className="h-30 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        </div>
        <div className="flex flex-col space-y-3 w-1/3">
          <Skeleton className="h-30 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        </div>
        <div className="flex flex-col space-y-3 w-1/3">
          <Skeleton className="h-30 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 rounded-xl" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}
