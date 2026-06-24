import { rankWith, uiTypeIs } from '@jsonforms/core';
import type { Categorization, Category, LayoutProps, RankedTester } from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsLayoutProps } from '@jsonforms/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/tabs';

export const categorizationTester: RankedTester = rankWith(1, uiTypeIs('Categorization'));

function CategorizationLayoutComponent({ uischema, schema, path, enabled, visible }: LayoutProps) {
  if (visible === false) {
    return null;
  }
  // Render only direct Category children; nested Categorizations are uncommon and fall
  // through to their own (recursive) renderer when wrapped in a Category.
  const categories = (uischema as Categorization).elements.filter(
    (element): element is Category => element.type === 'Category',
  );

  return (
    <Tabs defaultValue="0">
      <TabsList>
        {categories.map((category, index) => (
          <TabsTrigger key={index} value={String(index)}>
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((category, index) => (
        <TabsContent key={index} value={String(index)} className="flex flex-col gap-4">
          {category.elements.map((child, childIndex) => (
            <JsonFormsDispatch
              key={childIndex}
              uischema={child}
              schema={schema}
              path={path}
              enabled={enabled}
            />
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

export const CategorizationLayoutRenderer = withJsonFormsLayoutProps(CategorizationLayoutComponent);
