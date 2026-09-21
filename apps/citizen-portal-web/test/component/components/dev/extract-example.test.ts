import { describe, expect, it } from 'vitest';
import { extractExample } from '@/components/dev/extract-example';

describe('extractExample Unit Test Suite', () => {
  it('extracts and dedents code between line comments (// #region and // #endregion)', () => {
    const source = `
import React from 'react';

// #region BasicExample
export function Example() {
  return <div>Hello World</div>;
}
// #endregion BasicExample

export default Example;
`;

    const result = extractExample(source, 'BasicExample');
    expect(result).toBe(`export function Example() {\n  return <div>Hello World</div>;\n}`);
  });

  it('extracts and dedents code between JSX comments ({/* #region */} and {/* #endregion */})', () => {
    const source = `
<div>
  {/* #region JsxSection */}
  <span>Line 1</span>
  <span>Line 2</span>
  {/* #endregion JsxSection */}
</div>
`;

    const result = extractExample(source, 'JsxSection');
    expect(result).toBe(`<span>Line 1</span>\n<span>Line 2</span>`);
  });

  it('handles names with special regex characters safely', () => {
    const source = `
// #region Foo.Bar$Baz(1)+[test]?
const value = 42;
// #endregion Foo.Bar$Baz(1)+[test]?
`;

    const result = extractExample(source, 'Foo.Bar$Baz(1)+[test]?');
    expect(result).toBe('const value = 42;');
  });

  it('throws an error if #region marker is not found in source', () => {
    const source = `
// #region RealRegion
const a = 1;
// #endregion RealRegion
`;

    expect(() => extractExample(source, 'MissingRegion')).toThrow(
      'extractExample: no "#region MissingRegion" marker found',
    );
  });

  it('throws an error if matching #endregion marker is not found after #region', () => {
    const source = `
// #region UnclosedRegion
const a = 1;
`;

    expect(() => extractExample(source, 'UnclosedRegion')).toThrow(
      'extractExample: no matching "#endregion UnclosedRegion" marker',
    );
  });

  it('handles empty or whitespace-only extracted body (indents.length === 0 branch in dedent)', () => {
    const source = `
// #region EmptyRegion

// #endregion EmptyRegion
`;

    const result = extractExample(source, 'EmptyRegion');
    expect(result).toBe('');
  });

  it('dedents multi-line content preserving relative indentation and ignoring empty lines', () => {
    const source = `
    // #region NestedBlock
    function parent() {
      if (true) {
        doSomething();
      }

      return null;
    }
    // #endregion NestedBlock
`;

    const result = extractExample(source, 'NestedBlock');
    expect(result).toBe(
      `function parent() {\n  if (true) {\n    doSomething();\n  }\n\n  return null;\n}`,
    );
  });

  it('handles mixed start and end comment marker styles with tabs and spaces', () => {
    const source = `
\t  {/* #region MixedMarker */}
\t  const x = 'mixed';
\t  // #endregion MixedMarker
`;

    const result = extractExample(source, 'MixedMarker');
    expect(result).toBe("const x = 'mixed';");
  });
});
