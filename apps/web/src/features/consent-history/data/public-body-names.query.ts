import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { publicBodiesApi } from "../../../api/public-bodies-api.client";

const PublicBodyNameDto = z.object({
  id: z.string(),
  staticId: z.string(),
  name: z.string(),
});

const PublicBodyNamesResponseDto = z.object({
  payload: z.array(PublicBodyNameDto),
});

export type PublicBodyName = z.infer<typeof PublicBodyNameDto>;

export const publicBodyNamesQueryOptions = queryOptions({
  queryKey: ["public-body-names"],
  queryFn: async () => {
    const { data } = await publicBodiesApi.get("/PublicBodies/names");
    return PublicBodyNamesResponseDto.parse(data);
  },
  staleTime: 1000 * 60 * 60, // cache for 1 hour since this data rarely changes
});
