// MDD test skeleton — 02-jsonforms-studio
// End-to-end-ish component tests for the Studio shell wired to a fake handoff.

describe("jsonforms-studio / Studio", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it.skip("should hydrate from the handoff in sessionStorage on mount", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should render Palette, Canvas, and Inspector regions", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should display an error state when the handoff id is missing or unknown", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should disable Apply when any Control has a dangling scope", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should write the result to sessionStorage and post the apply message on Apply", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should hide Apply entirely in readonly mode", () => {
    throw new Error("Not implemented — MDD skeleton");
  });

  it.skip("should clear history after Apply", () => {
    throw new Error("Not implemented — MDD skeleton");
  });
});
