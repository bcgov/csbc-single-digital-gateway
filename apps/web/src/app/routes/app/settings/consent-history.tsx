import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Separator,
} from "@repo/ui";
import { IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { ConsentHistoryFilters } from "../../../../features/consent-history/components/consent-history-filters.component";
import { ConsentTimeline } from "../../../../features/consent-history/components/consent-timeline.component";
import { consentTimelineQueryOptions } from "../../../../features/consent-history/data/consent-timeline.query";

const SearchSchema = z.object({
  search: z.string().optional().catch(undefined),
  documentType: z.array(z.string()).optional().catch(undefined),
  status: z.array(z.string()).optional().catch(undefined),
  from: z.string().optional().catch(undefined),
  to: z.string().optional().catch(undefined),
  page: z.number().optional().catch(undefined),
});

export const Route = createFileRoute("/app/settings/consent-history")({
  validateSearch: SearchSchema,
  staticData: {
    breadcrumbs: () => [
      { label: "Settings" },
      { label: "Consent history" },
    ],
  },
  component: ConsentHistoryPage,
});

function ConsentHistoryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/app/settings/consent-history" });

  const [searchInput, setSearchInput] = useState(search.search ?? "");

  useEffect(() => {
    setSearchInput(search.search ?? "");
  }, [search.search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== (search.search ?? "")) {
        navigate({
          search: (prev) => ({
            ...prev,
            search: trimmed || undefined,
            page: undefined,
          }),
          replace: true,
        });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, search.search, navigate]);

  const { data } = useQuery(
    consentTimelineQueryOptions({
      search: search.search,
      documentType: search.documentType,
      status: search.status,
      from: search.from,
      to: search.to,
      page: search.page,
    }),
  );

  const groups = data?.docs ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? 1;

  const goToPage = (page: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: page > 1 ? page : undefined,
      }),
      replace: true,
    });
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">Consent history</h1>
        <p className="text-muted-foreground">
          Review your current and past consents for services.
        </p>
      </div>

      <InputGroup>
        <InputGroupAddon align="inline-start">
          <IconSearch className="size-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Search consents..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </InputGroup>

      <Separator className="bg-bcgov-gold" />

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <ConsentTimeline groups={groups} />

          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => goToPage(currentPage - 1)}
                      aria-disabled={currentPage <= 1}
                      className={
                        currentPage <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => goToPage(page)}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => goToPage(currentPage + 1)}
                      aria-disabled={currentPage >= totalPages}
                      className={
                        currentPage >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        <div className="col-span-1">
          <ConsentHistoryFilters
            documentType={search.documentType}
            status={search.status}
            from={search.from}
            to={search.to}
          />
        </div>
      </div>
    </div>
  );
}
