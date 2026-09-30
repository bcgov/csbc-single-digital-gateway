/**
 * Queues mock return values for a specific table reference.
 * Ensures deterministic ordering for select queries.
 * @param table Drizzle table reference
 * @param value Array of mock rows for this table
 * @param tableResponses Map to register the mocked responses
 */
export const createMockResponse = (tableResponses: Map<any, any[]>, table: any, value: any) => {
  if (!tableResponses.has(table)) {
    tableResponses.set(table, []);
  }
  tableResponses.get(table)!.push(value);
};
