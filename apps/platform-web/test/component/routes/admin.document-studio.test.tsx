import { describe, expect, it } from 'vitest';
import { validateDocumentStudioSearch } from '@/routes/admin.document-studio';

describe('validateDocumentStudioSearch', () => {
  it('keeps well-formed ids, kind and type', () => {
    expect(
      validateDocumentStudioSearch({
        documentId: 'd1',
        versionId: 'v1',
        kind: 'template',
        type: 'services.service-agreement',
      }),
    ).toEqual({
      documentId: 'd1',
      versionId: 'v1',
      kind: 'template',
      type: 'services.service-agreement',
    });
  });

  it('omits absent, empty and unknown values rather than passing them through', () => {
    expect(validateDocumentStudioSearch({})).toEqual({});
    expect(
      validateDocumentStudioSearch({
        documentId: '',
        versionId: 7,
        kind: 'draft',
        type: 'service',
      }),
    ).toEqual({});
  });
});
