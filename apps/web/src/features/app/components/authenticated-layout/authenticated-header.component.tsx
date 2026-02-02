export const AuthenticatedHeader = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  return (
    <header className="border-b border-neutral-300 mb-4">{children}</header>
  );
};
