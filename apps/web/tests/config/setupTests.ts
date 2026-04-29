import "@testing-library/jest-dom";

if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(value: T): T =>
    JSON.parse(JSON.stringify(value));
}
