import { describe, expect, it } from "vitest";
import {
  getInsertOrder,
  getTruncateStatement,
  orgUnitFixtureSchema,
  parseFixture,
  splitParentForTwoPass,
  TABLE_NAMES,
} from "../seed-helpers.ts";

describe("getInsertOrder", () => {
  it("places parents before their FK dependants", () => {
    const order = getInsertOrder();

    expect(order.indexOf("org_units")).toBeLessThan(
      order.indexOf("org_unit_relations"),
    );
    expect(order.indexOf("service_types")).toBeLessThan(
      order.indexOf("service_type_versions"),
    );
    expect(order.indexOf("service_type_versions")).toBeLessThan(
      order.indexOf("service_type_version_translations"),
    );
    expect(order.indexOf("services")).toBeLessThan(
      order.indexOf("service_versions"),
    );
    expect(order.indexOf("service_versions")).toBeLessThan(
      order.indexOf("service_version_translations"),
    );
    expect(order.indexOf("org_units")).toBeLessThan(order.indexOf("services"));
    expect(order.indexOf("service_types")).toBeLessThan(
      order.indexOf("services"),
    );
  });

  it("covers exactly the eight in-scope tables", () => {
    const order = getInsertOrder();
    expect(order).toHaveLength(8);
    expect([...order].sort()).toEqual([...TABLE_NAMES].sort());
  });
});

describe("getTruncateStatement", () => {
  it("produces a single TRUNCATE … RESTART IDENTITY CASCADE", () => {
    const stmt = getTruncateStatement();
    expect(stmt.startsWith("TRUNCATE ")).toBe(true);
    expect(stmt.endsWith("RESTART IDENTITY CASCADE;")).toBe(true);
    for (const t of TABLE_NAMES) {
      expect(stmt).toContain(t);
    }
  });

  it("excludes user-owned tables", () => {
    const stmt = getTruncateStatement();
    expect(stmt).not.toContain("service_contributors");
    expect(stmt).not.toContain("org_unit_members");
  });
});

describe("splitParentForTwoPass", () => {
  it("nulls the pointer in firstPass and emits an update for non-null pointers", () => {
    type Row = { id: string; ptr: string | null; other: number };
    const rows: Row[] = [
      { id: "a", ptr: "v1", other: 1 },
      { id: "b", ptr: null, other: 2 },
      { id: "c", ptr: "v3", other: 3 },
    ];

    const { firstPass, pointerUpdates } = splitParentForTwoPass(rows, "ptr");

    expect(firstPass).toEqual([
      { id: "a", ptr: null, other: 1 },
      { id: "b", ptr: null, other: 2 },
      { id: "c", ptr: null, other: 3 },
    ]);
    expect(pointerUpdates).toEqual([
      { id: "a", pointerId: "v1" },
      { id: "c", pointerId: "v3" },
    ]);
  });

  it("returns no pointer updates when every pointer is null", () => {
    const rows = [
      { id: "a", ptr: null },
      { id: "b", ptr: null },
    ];
    const { firstPass, pointerUpdates } = splitParentForTwoPass(rows, "ptr");
    expect(firstPass).toHaveLength(2);
    expect(pointerUpdates).toEqual([]);
  });

  it("does not mutate the input rows", () => {
    const rows = [{ id: "a", ptr: "v1" as string | null }];
    const original = JSON.parse(JSON.stringify(rows));

    splitParentForTwoPass(rows, "ptr");

    expect(rows).toEqual(original);
  });
});

describe("parseFixture", () => {
  const validRow = {
    id: "9f3a1b2c-1d4e-4a5b-9c6d-7e8f9a0b1c2d",
    name: "Ministry of X",
    type: "ministry",
    createdAt: "2025-09-12T14:31:00.000Z",
    updatedAt: "2025-09-12T14:31:00.000Z",
  };

  it("returns parsed rows when the fixture matches the schema", () => {
    const rows = parseFixture([validRow], orgUnitFixtureSchema);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(validRow.id);
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("throws when a row has the wrong shape", () => {
    expect(() =>
      parseFixture([{ ...validRow, type: "not-a-type" }], orgUnitFixtureSchema),
    ).toThrow();
  });

  it("throws when the input is not an array", () => {
    expect(() => parseFixture(validRow, orgUnitFixtureSchema)).toThrow();
  });

  it("accepts an empty array", () => {
    expect(parseFixture([], orgUnitFixtureSchema)).toEqual([]);
  });
});
