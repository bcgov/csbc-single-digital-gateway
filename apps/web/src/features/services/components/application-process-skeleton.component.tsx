export function ApplicationProcessSkeleton() {
  return (
    <ol
      className="flex flex-col gap-3 list-none p-0 m-0"
      aria-label="Loading application process"
      aria-busy="true"
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start gap-3 animate-pulse">
          <div className="shrink-0 h-7 w-7 rounded-full bg-muted" />
          <div className="flex flex-col gap-2 grow pt-1">
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        </li>
      ))}
    </ol>
  );
}
