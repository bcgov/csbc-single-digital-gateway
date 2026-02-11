import axios from "axios";

export const serviceCatalogueApi = axios.create({
  baseURL: import.meta.env.VITE_SERVICE_CATALOGUE_API_URL,
  headers: { "Content-Type": "application/json" },
});
