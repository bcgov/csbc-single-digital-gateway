import supertest from "supertest";

const APP_PORT = process.env.APP_PORT ?? "3000";
const BASE_URL = `http://localhost:${APP_PORT}`;

const request = supertest(BASE_URL);

// Specify the title and the type of test in the syntax below
describe("Home Page E2E Test", () => {
  beforeAll(() => {
    if (!process.env.APP_PORT) {
      console.warn(
        `[E2E] APP_PORT not set — falling back to port ${APP_PORT}. ` +
          `Run with: APP_PORT=<port> npm run test:e2e`,
      );
    }
  });

  describe("GET method calls", () => {
    // Test case: should return HTTP status 200
    // The comments are not required in an actual test file.
    // Make sure to capitalize the first letter to make it consistent across all test files.
    it("Should return HTTP status 200", async () => {
      const response = await request.get("/");

      expect(response.status).toBe(200);
    });

    it("Should return a non-empty response body", async () => {
      const response = await request.get("/");

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(0);
    });

    it("Should return Content-Type that includes text/html", async () => {
      const response = await request.get("/");

      expect(response.headers["content-type"]).toMatch(/text\/html/);
    });

    it("Should return a response body containing valid HTML structure", async () => {
      const response = await request.get("/");

      expect(response.text).toContain("<html");
      expect(response.text).toContain("<head");
      expect(response.text).toContain("<body");
    });

    it("Should respond within 2000ms", async () => {
      const start = Date.now();

      await request.get("/");

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(2000);
    });

    it("Should not return a 404 response", async () => {
      const response = await request.get("/");

      expect(response.status).not.toBe(404);
    });

    it("Should not return a 500 response", async () => {
      const response = await request.get("/");

      expect(response.status).not.toBe(500);
    });
  });
});
