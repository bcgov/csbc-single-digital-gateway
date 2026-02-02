import { AppSearch } from "../app-search";
import { AppSearchProvider } from "../app-search/app-search.context";
import { Breadcrumbs } from "../breadcrumbs";
import { Container } from "../container.component";
import { AuthenticatedFooter } from "./authenticated-footer.component";
import { AuthenticatedHeader } from "./authenticated-header.component";
import {
  AuthenticatedNavigationBar,
  navigationItems,
} from "./authenticated-navigation-bar.component";

export const AuthenticatedLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <AppSearchProvider>
      <div className="flex h-dvh flex-col">
        <AuthenticatedHeader>
          <AuthenticatedNavigationBar />
          <Breadcrumbs />
        </AuthenticatedHeader>
        <Container className="flex-auto">{children}</Container>
        <AuthenticatedFooter />
      </div>
      <AppSearch navigationItems={navigationItems} />
    </AppSearchProvider>
  );
};
