import { buildUrlAsyncLoader } from "./async-select-url-loader.js";

type FetchMock = jest.Mock<
  Promise<{ ok: boolean; json: () => Promise<unknown> }>,
  [string, unknown?]
>;

function mockFetch(payload: unknown, ok = true): FetchMock {
  const fn: FetchMock = jest.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  });
  (globalThis as unknown as { fetch: FetchMock }).fetch = fn;
  return fn;
}

beforeAll(() => {
  // jsdom-free smoke: stub window.location
  (globalThis as unknown as { window: { location: { origin: string } } }).window = {
    location: { origin: "http://localhost" },
  };
});

describe("buildUrlAsyncLoader", () => {
  it("maps rows using default mapping (id/name) with `docs` results path", async () => {
    mockFetch({ docs: [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }] });
    const loader = buildUrlAsyncLoader("/api/things");
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([
      { value: "a", label: "Alpha" },
      { value: "b", label: "Beta" },
    ]);
    expect(result.hasMore).toBe(false);
  });

  it("honors custom mapping results/value/label", async () => {
    mockFetch({ payload: { rows: [{ code: 1, title: "One" }] } });
    const loader = buildUrlAsyncLoader("/api/x", {
      results: "payload.rows",
      value: "code",
      label: "title",
    });
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([{ value: "1", label: "One" }]);
  });

  it("accepts a raw array response", async () => {
    mockFetch([{ id: "x", name: "X" }]);
    const loader = buildUrlAsyncLoader("/api/x");
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([{ value: "x", label: "X" }]);
  });

  it("falls back through common results keys", async () => {
    mockFetch({ items: [{ id: "k", name: "K" }] });
    const loader = buildUrlAsyncLoader("/api/x");
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([{ value: "k", label: "K" }]);
  });

  it("returns empty options on non-ok response", async () => {
    mockFetch(null, false);
    const loader = buildUrlAsyncLoader("/api/x");
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([]);
  });

  it("returns empty array when payload shape is unrecognized", async () => {
    mockFetch({ unknown: "shape" });
    const loader = buildUrlAsyncLoader("/api/x");
    const result = await loader.loadOptions("", [], undefined);
    expect(result.options).toEqual([]);
  });
});
