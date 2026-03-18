export const Container = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`@container ${className}`}>
      <div className="mx-4 md:mx-8 xl:mx-auto max-w-280">{children}</div>
    </div>
  );
};
