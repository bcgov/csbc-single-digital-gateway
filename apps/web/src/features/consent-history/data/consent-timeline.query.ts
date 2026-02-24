import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { consentManagerApi } from "../../../api/consent-manager-api.client";

const TimelineItemDto = z.object({
  id: z.string(),
  documentName: z.string(),
  status: z.enum(["granted", "revoked"]),
  statementDate: z.string(),
});

const TimelineDateGroupDto = z.object({
  date: z.string(),
  items: z.array(TimelineItemDto),
});

const TimelineResponseDto = z.object({
  docs: z.array(TimelineDateGroupDto),
  totalDocs: z.number(),
  totalPages: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type TimelineItem = z.infer<typeof TimelineItemDto>;
export type TimelineDateGroup = z.infer<typeof TimelineDateGroupDto>;
export type TimelineResponse = z.infer<typeof TimelineResponseDto>;

export interface ConsentTimelineParams {
  search?: string;
  documentType?: string[];
  status?: string[];
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function consentTimelineQueryOptions(params: ConsentTimelineParams) {
  return queryOptions({
    queryKey: [
      "consent-timeline",
      params.search,
      params.documentType,
      params.status,
      params.from,
      params.to,
      params.page,
      params.limit,
    ],
    queryFn: async () => {
      const { data } = await consentManagerApi.get(
        "/api/v1/statements/timeline",
        {
          params: {
            search: params.search || undefined,
            documentType: params.documentType?.length
              ? params.documentType.join(",")
              : undefined,
            status: params.status?.length
              ? params.status.join(",")
              : undefined,
            from: params.from || undefined,
            to: params.to || undefined,
            page: params.page ?? 1,
            limit: params.limit ?? 10,
          },
        },
      );
      return TimelineResponseDto.parse(data);
    },
  });
}
