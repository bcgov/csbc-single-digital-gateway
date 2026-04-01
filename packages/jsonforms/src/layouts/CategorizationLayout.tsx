import type { Categorization, Category, LayoutProps } from "@jsonforms/core";
import { rankWith, uiTypeIs } from "@jsonforms/core";
import {
  JsonFormsDispatch,
  withJsonFormsLayoutProps,
} from "@jsonforms/react";
import {
  FieldGroup,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui";

function CategorizationLayoutRenderer({
  uischema,
  schema,
  path,
  enabled,
  visible,
  renderers,
  cells,
}: LayoutProps) {
  if (!visible) {
    return null;
  }

  const categorization = uischema as Categorization;
  const categories = categorization.elements as Category[];

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <Tabs defaultValue={0}>
      <TabsList>
        {categories.map((category, index) => (
          <TabsTrigger key={index} value={index}>
            {category.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {categories.map((category, index) => (
        <TabsContent key={index} value={index}>
          <FieldGroup>
            {(category.elements ?? []).map((element, elementIndex) => (
              <JsonFormsDispatch
                key={elementIndex}
                uischema={element}
                schema={schema}
                path={path}
                enabled={enabled}
                renderers={renderers}
                cells={cells}
              />
            ))}
          </FieldGroup>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export const categorizationLayoutTester = rankWith(
  3,
  uiTypeIs("Categorization"),
);
export const CategorizationLayout = withJsonFormsLayoutProps(
  CategorizationLayoutRenderer,
);
export const categorizationLayoutEntry = {
  tester: categorizationLayoutTester,
  renderer: CategorizationLayout,
};
