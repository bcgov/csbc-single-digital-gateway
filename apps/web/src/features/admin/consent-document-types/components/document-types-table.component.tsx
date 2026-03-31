import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { Link } from "@tanstack/react-router";
import type { ConsentDocumentTypeListItem } from "../data/consent-document-types.query";

interface DocumentTypesTableProps {
  types: ConsentDocumentTypeListItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function DocumentTypesTable({
  types,
  currentPage,
  totalPages,
  onPageChange,
}: DocumentTypesTableProps) {
  if (types.length === 0 && currentPage === 1) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No document types found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <TableRow key={type.id} className="cursor-pointer">
              <TableCell>
                <Link
                  to="/admin/settings/consent/document-types/$typeId"
                  params={{ typeId: type.id }}
                  className="font-medium text-bcgov-blue hover:underline"
                >
                  {type.id.slice(0, 8)}…
                </Link>
              </TableCell>
              <TableCell>
                {type.publishedConsentDocumentTypeVersionId
                  ? "Published"
                  : "Unpublished"}
              </TableCell>
              <TableCell>
                {new Date(type.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                {new Date(type.updatedAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex justify-end">
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(currentPage - 1)}
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
                      onClick={() => onPageChange(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(currentPage + 1)}
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
  );
}
