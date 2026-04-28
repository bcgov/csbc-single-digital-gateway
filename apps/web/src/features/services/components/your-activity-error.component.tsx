interface YourActivityErrorProps {
  onRetry: () => void;
}

export function YourActivityError({ onRetry }: YourActivityErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 border border-red-20 bg-red-10 p-4"
    >
      <p className="font-semibold">Couldn&apos;t load your applications.</p>
      <button
        type="button"
        onClick={onRetry}
        className="self-start underline"
      >
        Try again
      </button>
    </div>
  );
}
