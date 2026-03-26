import { Breadcrumbs } from "../../app/components/breadcrumbs";
import { AdminNavigationBar } from "./admin-navigation-bar.component";

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-dvh flex-col">
      <header>
        <AdminNavigationBar />
        <Breadcrumbs />
      </header>
      <main id="main-content" className="flex-auto px-4 md:px-8" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
};
