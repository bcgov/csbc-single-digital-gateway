import { IconLoader2 } from "@tabler/icons-react";

interface StartingApplicationLoaderProps {
  message?: string;
}

export function StartingApplicationLoader({
  message = "Starting your application…",
}: StartingApplicationLoaderProps) {
  return (
    <div
      data-testid="starting-application-loader"
      className="flex flex-col items-center justify-center gap-4 py-16"
    >
      <IconLoader2
        className="animate-spin text-muted-foreground"
        size={48}
        stroke={1.5}
        aria-hidden="true"
      />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
