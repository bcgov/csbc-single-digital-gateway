export const Container = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`@container ${className}`}>
      <div className="mx-4 md:mx-12 lg:mx-24 xl:mx-40">{children}</div>
    </div>
  );
};
