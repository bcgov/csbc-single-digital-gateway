import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../../../api/api.client";
import { ServiceDto } from "../service.dto";

export const servicesQueryOptions = queryOptions({
  queryKey: ["services"],
  queryFn: async () => {
    const { data } = await api.get("/v1/services");
    console.log("data: ", data);
    return z.array(ServiceDto).parse(data.data);
  },
});
