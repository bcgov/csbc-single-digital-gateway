import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const SearchSchema = z.object({
  state: z.string().optional(),
});

export const Route = createFileRoute("/(public)/callback")({
  validateSearch: SearchSchema,
  beforeLoad: ({ search }) => {
    if (search.state) {
      throw redirect({
        replace: true,
        to: "/callback",
      });
    } else {
      const next = sessionStorage.getItem("auth.next");
      sessionStorage.removeItem("auth.next");

      throw redirect({
        replace: true,
        to: next ?? "/app",
      });
    }
  },
});
