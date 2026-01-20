import { Container } from "../container.component";
import { PublicFooter } from "./public-footer.component";
import { PublicHeader } from "./public-header.component";
import { PublicNavigationBar } from "./public-navigation-bar.component";

export const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-dvh flex-col">
      <PublicHeader>
        <PublicNavigationBar />
      </PublicHeader>
      <Container className="flex-auto">{children}</Container>
      <PublicFooter />
    </div>
  );
};
