import {
  AccordionContent,
  AccordionGroup,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  Separator,
} from "@repo/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { consentStatementQueryOptions } from "../../../../../features/consent-history/data/consent-statement.query";
import { publicBodyNamesQueryOptions } from "../../../../../features/consent-history/data/public-body-names.query";
import { LexicalContent } from "../../../../../features/services/components/lexical-content.component";
import { queryClient } from "../../../../../lib/react-query.client";

export const Route = createFileRoute(
  "/app/settings/consent-history/$statementId",
)({
  loader: async ({ params }) => {
    const statement = await queryClient.ensureQueryData(
      consentStatementQueryOptions(params.statementId),
    );
    return { documentName: statement.document.name };
  },
  staticData: {
    breadcrumbs: (loaderData?: { documentName: string }) => [
      { label: "Settings" },
      { label: "Consent history", to: "/app/settings/consent-history" },
      ...(loaderData?.documentName
        ? [{ label: `${loaderData.documentName} Statement` }]
        : []),
    ],
  },
  component: ConsentStatementPage,
});

function ConsentStatementPage() {
  const { statementId } = Route.useParams();

  const {
    data: statement,
    isLoading,
    error,
  } = useQuery(consentStatementQueryOptions(statementId));

  const { data: publicBodies } = useQuery(publicBodyNamesQueryOptions);

  if (isLoading) return <p className="py-8 text-center">Loading…</p>;
  if (error)
    return (
      <p className="py-8 text-center text-red-600">Error: {error.message}</p>
    );
  if (!statement) return null;

  const organizationName =
    publicBodies?.payload.find(
      (body) =>
        body.id === statement.document.organizationId ||
        body.staticId === statement.document.organizationId,
    )?.name ?? statement.document.organizationId;

  const formattedDate = new Date(statement.createdAt).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedStatementDate = formattedDate;

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="text-2xl font-bold">{statement.document.name}</h1>
        <p className="text-muted-foreground">{formattedDate}</p>
      </div>

      <Separator className="bg-bcgov-gold" />

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 flex flex-col gap-4">
          <h2 className="text-lg font-bold">Overview</h2>

          <div className="flex flex-col gap-px bg-neutral-200 border-neutral-200 border">
            <div className="grid grid-cols-2 gap-px">
              <div className="bg-white p-4">
                <p className="text-muted-foreground text-sm font-bold">
                  Signed
                </p>
                <p className="font-medium">{formattedStatementDate}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-muted-foreground text-sm font-bold">
                  Valid until
                </p>
                <p className="font-medium">Until the program concludes</p>
              </div>
            </div>
            <div className="bg-white p-4">
              <p className="text-muted-foreground text-sm font-bold">
                Managed by
              </p>
              <p className="font-medium">{organizationName}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold">Consent Statement</h2>

          <Card size="sm">
            <CardContent>
              <LexicalContent content={statement.version.content} />
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1">
          <AccordionGroup
            title="Resources & support"
            values={["recommended-reading"]}
          >
            <AccordionItem value="recommended-reading">
              <AccordionTrigger>Recommended Reading</AccordionTrigger>
              <AccordionContent>
                <p>
                  <a href="https://gov.bc.ca" target="_blank">
                    What is a consent statement?
                  </a>
                </p>
                <p>
                  <a href="https://gov.bc.ca" target="_blank">
                    Can I revoke my consent?
                  </a>
                </p>
              </AccordionContent>
            </AccordionItem>
          </AccordionGroup>
        </div>
      </div>
    </div>
  );
}
