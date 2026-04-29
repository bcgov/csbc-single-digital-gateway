import { Cookie } from "k6/browser";
import { bcscMeEndpoint } from "../utils/api-endpoints.ts";
import { setCookies } from "../utils/set-cookies.ts";

export const options = {
  stages: [
    {
      duration: "10s",
      target: 10,
    },
    {
      duration: "30s",
      target: 10,
    },
    {
      duration: "10s",
      target: 0,
    },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the API load tests. The purpose of these load
 * tests is to simulate real-world usage scenarios and measure the performance
 * of the application under load.
 */
export default function apiLoadTest() {
  setCookies(cookieData);

  // BCSC/Me endpoint
  bcscMeEndpoint();
}
