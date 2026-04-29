export function YourActivitySkeleton() {
  return (
    <ul
      className="flex flex-col gap-px border bg-border list-none p-0 m-0"
      aria-label="Loading your applications"
      aria-busy="true"
    >
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="flex items-center gap-4 px-4 py-3 bg-white animate-pulse"
        >
          <div className="flex flex-col justify-center min-w-0 grow gap-2">
            <div className="h-4 w-2/3 bg-muted rounded" />
            <div className="h-3 w-1/3 bg-muted rounded" />
          </div>
          <div className="shrink-0 h-5 w-5 bg-muted rounded" />
        </li>
      ))}
    </ul>
  );
}
