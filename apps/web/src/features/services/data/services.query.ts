import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { serviceCatalogueApi } from "../../../api/service-catalogue-api.client";
import { ServiceDto } from "../service.dto";

export const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const { data } = await serviceCatalogueApi.get("/api/v1/services");
    return z.array(ServiceDto).parse(data.docs);
  },
});
