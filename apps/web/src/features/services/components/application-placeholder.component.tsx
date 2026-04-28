interface ApplicationPlaceholderProps {
  applicationId: string;
}

export function ApplicationPlaceholder({
  applicationId,
}: ApplicationPlaceholderProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1>Your application</h1>
      <p className="text-muted-foreground">
        This is a placeholder. A full application status view is coming soon.
      </p>
      <p>
        Application ID: <code>{applicationId}</code>
      </p>
    </div>
  );
}
