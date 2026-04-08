/**
 * This file mocks the `consentDocumentsQueryOptions` function from the consent document query
 * module for testing purposes. It uses Jest to create a mock function that can be used in tests
 * to verify that `consentDocumentsQueryOptions` is called with the correct arguments and to
 * control its return value.
 */
export const mockConsentDocumentsQueryOptions = jest.fn(
  (documentIds: string[]) => ({
    queryKey: ["consent-documents", documentIds],
  }),
);

jest.mock("src/features/services/data/consent-document.query", () => ({
  consentDocumentsQueryOptions: (...args: unknown[]) =>
    mockConsentDocumentsQueryOptions(...(args as [string[]])),
}));
