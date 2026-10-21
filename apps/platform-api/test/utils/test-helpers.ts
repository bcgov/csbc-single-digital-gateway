import { AuthUser } from '@repo/nestjs/auth';

/**
 * Auth + validation posture for the citizen notifications proxy (feature 113). The upstream
 * notification-service is NOT running in the suite, so only pre-proxy behavior (401 guard,
 * 400 boundary validation) is asserted; live proxy behavior is verified against the running
 * stack in integration.
 */
export const seedUser = (roles: string[] = ['staff']): string =>
  JSON.stringify({ id: 'u', roles, claims: { sub: 'u' } } satisfies AuthUser);

export const createMockList = (
  id: string = 'type-1',
  name: string = 'Type 1',
  title: string = 'Agreement 1',
) => {
  const defaultItem = { id, name, title };
  return [defaultItem];
};

/**
 * Create a type version fixture.
 * @param param0 {
 *   id?: string;
 *   status?: string;
 *   definition?: object;
 * }
 * @returns a mock type version record.
 */
export const createMockTypeVersion = ({
  id = 'v-1',
  status = 'draft',
  definition = {},
}: {
  id?: string;
  status?: string;
  definition?: object;
}) => {
  return { id, definition, status };
};

/**
 * Create a form version fixture.
 * @param param0 {
 *   id?: string;
 *   documentId?: string;
 *   version?: number;
 *   status?: string;
 *   createdAt?: Date;
 * }
 * @returns a mock form version record.
 */
export const createMockFormVersion = ({
  id = 'version-1',
  documentId = 'doc-1',
  version = 1,
  status = 'draft',
  createdAt = new Date('2026-07-12T00:00:00.000Z'),
}: {
  id?: string;
  documentId?: string;
  version?: number;
  status?: string;
  createdAt?: Date;
}) => {
  return {
    id,
    documentId,
    version,
    status,
    schema: { schema: {}, uischema: {} },
    createdAt,
  };
};

/**
 * Create a document root fixture. Note that the DB schema defines createdAt and
 * updatedAt as nullable; we align with that choice here to avoid false positives
 * in tests.
 * @param param0 {
 *   id?: string;
 *   workspaceId?: string | null;
 *   title?: string;
 *   kind?: string;
 *   description?: string | undefined;
 *   createdAt?: Date;
 *   updatedAt?: Date | undefined;
 * }
 * @returns a mock document root record.
 */
export const createMockDoc = ({
  id = 'doc-1',
  workspaceId = 'ws-1',
  title = 'New Form',
  kind = 'basic-form',
  description,
  createdAt = new Date('2026-07-12T00:00:00.000Z'),
  updatedAt,
}: {
  id?: string;
  workspaceId?: string | null;
  title?: string;
  kind?: string;
  description?: string | undefined;
  createdAt?: Date;
  updatedAt?: Date | undefined;
}) => {
  const defaultDoc: {
    id: string;
    workspaceId: string | null;
    title: string;
    kind: string;
    description: string | undefined;
    createdAt: Date;
    updatedAt?: Date | undefined;
  } = {
    id,
    workspaceId,
    title,
    kind,
    description: undefined,
    createdAt,
    updatedAt: undefined,
  };
  if (description !== undefined) {
    defaultDoc.description = description;
  }
  if (updatedAt !== undefined) {
    defaultDoc.updatedAt = updatedAt;
  }
  return defaultDoc;
};

/**
 * Create a mock version fixture.
 * @param param0 {
 *   id?: string;
 *   version?: number;
 *   status?: string;
 *   data?: object;
 *   createdAt?: Date;
 *   updatedAt?: Date;
 *   publishedAt?: Date | null;
 *   archivedAt?: Date | null;
 * }
 * @returns a mock version record.
 */
export const createMockVersion = ({
  id = 'ver-123',
  version = 1,
  status = 'draft',
  data = {},
  createdAt = new Date('2026-07-28T12:00:00.000Z'),
  updatedAt = new Date('2026-07-28T12:00:00.000Z'),
  publishedAt = null,
  archivedAt = null,
}: {
  id?: string;
  version?: number;
  status?: string;
  data?: object;
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
}) => {
  return {
    id,
    version,
    status,
    data,
    createdAt,
    updatedAt,
    publishedAt,
    archivedAt,
  };
};

/**
 * Create a mock reference.
 * @param param0 {
 *   id?: string;
 *   relation?: string;
 *   position?: number;
 *   label?: string | null;
 *   targetDocumentId?: string;
 *   targetVersionId?: string | null;
 *   targetKind?: string;
 *   createdAt?: Date;
 * }
 * @returns a mock reference record.
 */
export const createMockRef = ({
  id = 'ref-1',
  relation = 'application_form',
  position = 0,
  label = null,
  targetDocumentId = 'target-form-1',
  targetVersionId = 'form-version-1',
  targetKind = 'basic-form',
  createdAt = new Date('2026-07-12T00:00:00.000Z'),
}: {
  id?: string;
  relation?: string;
  position?: number;
  label?: string | null;
  targetDocumentId?: string;
  targetVersionId?: string | null;
  targetKind?: string;
  createdAt?: Date;
}) => {
  return {
    id,
    relation,
    position,
    label,
    targetDocumentId,
    targetVersionId,
    targetKind,
    createdAt,
  };
};
