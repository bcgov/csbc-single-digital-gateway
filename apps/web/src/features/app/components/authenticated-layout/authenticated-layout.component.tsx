import { AppSearch } from "../app-search";
import { AppSearchProvider } from "../app-search/app-search.context";
import { Breadcrumbs } from "../breadcrumbs";
import { Container } from "../container.component";
import { navigationItems } from "./authenticated-navigation-bar.component";
import { AuthenticatedFooter } from "./authenticated-footer.component";
import { AuthenticatedHeader } from "./authenticated-header.component";
import { AuthenticatedNavigationBar } from "./authenticated-navigation-bar.component";

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
        </AuthenticatedHeader>
        <Breadcrumbs />
        <Container className="flex-auto">{children}</Container>
        <AuthenticatedFooter />
      </div>
      <AppSearch navigationItems={navigationItems} />
    </AppSearchProvider>
  );
};
