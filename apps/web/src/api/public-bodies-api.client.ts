import axios from "axios";

export const publicBodiesApi = axios.create({
  baseURL: "https://public-bodies.dev.api.gov.bc.ca",
  headers: { "Content-Type": "application/json" },
});
