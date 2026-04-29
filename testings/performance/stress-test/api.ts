import { Cookie } from "k6/browser";
import { bcscMeEndpoint } from "../utils/api-endpoints.ts";
import { setCookies } from "../utils/set-cookies.ts";

export const options = {
  stages: [
    {
      duration: "20s",
      target: 30,
    },
    {
      duration: "30s",
      target: 30,
    },
    {
      duration: "20s",
      target: 0,
    },
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests should be below 1000ms
    http_req_failed: ["rate<0.01"], // Less than 1% of requests should fail
  },
};

// Load cookies from JSON file
const cookieData: Cookie[] = JSON.parse(open("../cookies/auth-cookies.json"));

/**
 * This is the main entry point for the API stress tests. The purpose of these stress
 * tests is to simulate real-world usage scenarios and measure the performance
 * of the application under stress.
 */
export default function apiStressTest() {
  setCookies(cookieData);

  // BCSC/Me endpoint
  bcscMeEndpoint();
}
