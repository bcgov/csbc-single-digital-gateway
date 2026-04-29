import { Cookie } from "k6/browser";
import { bcscMeEndpoint } from "../utils/api-endpoints.ts";
import { setCookies } from "../utils/set-cookies.ts";

export const options = {
  vus: 1,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(95)<200"], // 95% of requests should be below 200ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the API smoke tests. The purpose of these smoke
 * tests is to simulate real-world usage scenarios and measure the performance
 * of the application under smoke.
 */
export default function apiSmokeTest() {
  setCookies(cookieData);

  // BCSC/Me endpoint
  bcscMeEndpoint();
}
