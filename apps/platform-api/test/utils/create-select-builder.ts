import { submissions } from '@repo/database';
import { vi } from 'vitest';

/**
 * Builder mock capturing Drizzle table queries and returning configured table responses.
 * @param tableResponses Map of table references to mocked return arrays
 * @param selector Optional Drizzle selector expression
 * @returns Mock QueryBuilder object
 */
export const createSelectBuilder = (tableResponses: Map<any, any[]>, selector?: any) => {
  let resolvedValue: any = [];
  /* eslint-disable unicorn/no-thenable */
  const qb: any = {
    then: (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled),
  };
  /* eslint-enable unicorn/no-thenable */
  qb.from = vi.fn().mockImplementation((table) => {
    const list = tableResponses.get(table) || [];
    let val = list.shift() ?? [];
    if (selector && 'sub' in selector && table === submissions && Array.isArray(val)) {
      val = val.map((item: any) =>
        item && 'sub' in item
          ? item
          : {
              sub: item,
              status: item.status ?? 'pending',
              submittedAt: item.submittedAt === undefined ? item.createdAt : item.submittedAt,
              versionUpdatedAt:
                item.versionUpdatedAt !== undefined ? item.versionUpdatedAt : item.updatedAt,
              serviceId: item.serviceId,
              serviceTitle: item.serviceTitle,
              formTitle: item.formTitle,
              applicantName: item.applicantName,
              applicantEmail: item.applicantEmail,
            },
      );
    }
    resolvedValue = val;
    return qb;
  });
  qb.innerJoin = vi.fn().mockReturnValue(qb);
  qb.leftJoin = vi.fn().mockReturnValue(qb);
  qb.where = vi.fn().mockReturnValue(qb);
  qb.orderBy = vi.fn().mockReturnValue(qb);
  qb.limit = vi.fn().mockReturnValue(qb);
  qb.offset = vi.fn().mockReturnValue(qb);
  return qb;
};
