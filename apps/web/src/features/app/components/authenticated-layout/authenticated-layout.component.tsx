import { Container } from "../container.component";
import { AuthenticatedFooter } from "./authenticated-footer.component";
import { AuthenticatedHeader } from "./authenticated-header.component";
import { AuthenticatedNavigationBar } from "./authenticated-navigation-bar.component";

export const AuthenticatedLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex h-dvh flex-col">
      <AuthenticatedHeader>
        <AuthenticatedNavigationBar />
      </AuthenticatedHeader>
      <Container className="flex-auto">{children}</Container>
      <AuthenticatedFooter />
    </div>
  );
};
