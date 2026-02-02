import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@repo/ui";
import { Link, useMatches } from "@tanstack/react-router";
import type { BreadcrumbItemDef } from "../../../../app/router";
import { Container } from "../container.component";

export const Breadcrumbs = () => {
  const matches = useMatches();

  const items: BreadcrumbItemDef[] = matches.flatMap((match) => {
    const resolver = (match.staticData as any)?.breadcrumbs;
    if (typeof resolver !== "function") return [];
    return resolver(match.loaderData);
  });

  if (items.length === 0) return null;

  return (
    <Container>
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <span key={item.to ?? `page-${index}`} className="contents">
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {item.to ? (
                  <BreadcrumbLink
                    render={<Link to={item.to} params={item.params ?? {}} />}
                  >
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </Container>
  );
};
