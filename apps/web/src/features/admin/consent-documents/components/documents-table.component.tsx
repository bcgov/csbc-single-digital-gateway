import {
  Button,
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
import { IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ConsentDocumentListItem } from "../data/consent-documents.query";

interface DocumentsTableProps {
  documents: ConsentDocumentListItem[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDelete: (docId: string) => void;
}

export function DocumentsTable({
  documents,
  currentPage,
  totalPages,
  onPageChange,
  onDelete,
}: DocumentsTableProps) {
  if (documents.length === 0 && currentPage === 1) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No documents found.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id} className="cursor-pointer">
              <TableCell>
                <Link
                  to="/admin/consent/documents/$docId"
                  params={{ docId: doc.id }}
                  className="font-medium text-bcgov-blue hover:underline"
                >
                  {doc.name ?? doc.id.slice(0, 8) + "…"}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {doc.description ?? "—"}
              </TableCell>
              <TableCell>
                {doc.publishedConsentDocumentVersionId
                  ? "Published"
                  : "Unpublished"}
              </TableCell>
              <TableCell>
                {new Date(doc.createdAt).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id);
                  }}
                >
                  <IconTrash className="size-4 text-destructive" />
                </Button>
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
