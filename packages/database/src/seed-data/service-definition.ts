/**
 * The seeded **Service** document type definition (`kind: 'service'`).
 *
 * Mirrored from the definition authored in the admin document-type editor, so a fresh database gets
 * the same Service content model a working one has. It lives in its own module because it is large
 * enough to push `seed.ts` past the 300-line gate.
 *
 * The shape matters to the console: **the Service details page derives its page sections from the
 * TOP-LEVEL `Group` elements of `uischema.elements`** (feature 174, see
 * `apps/platform-web/src/lib/service-sections.ts`), and the service sidebar's "Service details"
 * submenu derives its anchors from the same helper. Each top-level Group here becomes one anchored
 * `<section>`; its `label` becomes the heading and the slug of that label becomes the anchor.
 * Reordering, renaming, adding or removing a top-level Group changes the page's sections.
 *
 * **Step flow (feature 176).** The `Categorization` inside the first Group carries
 * `options.variant: 'flow'`, which dispatches the flow layout renderer (step rail + one category at
 * a time + a pinned save bar) instead of the default tab strip. Removing that one key restores
 * tabs; no other Categorization in the tree has it, and an unrecognised variant falls through to
 * tabs too.
 *
 * **Windowed editing (feature 175).** A layout element marked `options.edit` gets an Edit button
 * beside its heading on the details page, opening a window scoped to that element. Two modes:
 * `edit: true` edits the element's own children; `edit: { editor: '<key>' }` mounts a component
 * from the console's `SECTION_EDITORS` registry — which is what the three Groups below with
 * `elements: []` use, since their content lives outside the schema (references, agreement refs).
 * The marker works at ANY depth, so a nested Group inside a Category can be made editable too.
 *
 * DEVIATION from the authored definition: it carried `schema.required: ['faq']` at the TOP level,
 * but `faq` lives at `details.faq` — there is no root-level `faq` property. Ajv reads that as
 * "the root object must have a `faq` key", which no service payload ever has, so saving or
 * publishing any version bound to that type version fails validation. It is corrected here to
 * `details.required: ['faq']`.
 *
 * Changing this file only affects FRESH databases (the seed is `onConflictDoNothing`). An existing
 * database needs an explicit new published `document_type_versions` row (demote-then-promote via
 * the admin editor); existing document versions stay pinned to their old type version through
 * `document_versions.type_version_id` and keep rendering against it.
 */
export const serviceDefinition = {
  schema: {
    type: 'object',
    properties: {
      details: {
        type: 'object',
        properties: {
          faq: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'description'],
              properties: {
                id: {
                  type: 'string',
                },
                title: {
                  type: 'string',
                  pattern: '\\S',
                },
                description: {
                  type: 'object',
                },
              },
            },
            minItems: 1,
          },
          about: {
            type: 'object',
          },
          title: {
            type: 'string',
            maxLength: 64,
          },
          targets: {
            type: 'object',
            properties: {
              max_cost: {
                min: 0,
                type: 'number',
              },
              min_cost: {
                min: 0,
                type: 'number',
              },
              max_wait_time: {
                type: 'string',
                oneOf: [
                  {
                    const: '1_month',
                    title: '1 Month',
                  },
                  {
                    const: '2_months',
                    title: '2 Months',
                  },
                  {
                    const: '3_months',
                    title: '3 Months',
                  },
                  {
                    const: '4_months',
                    title: '4 Months',
                  },
                  {
                    const: '5_months',
                    title: '5 Months',
                  },
                  {
                    const: '6_months',
                    title: '6 Months',
                  },
                  {
                    const: '7_months',
                    title: '7 Months',
                  },
                  {
                    const: '8_months',
                    title: '8 Months',
                  },
                  {
                    const: '9_months',
                    title: '9 Months',
                  },
                  {
                    const: '10_months',
                    title: '10 Months',
                  },
                  {
                    const: '11_months',
                    title: '11 Months',
                  },
                  {
                    const: '12_months',
                    title: '12 Months',
                  },
                ],
              },
              min_wait_time: {
                type: 'string',
                oneOf: [
                  {
                    const: '1_month',
                    title: '1 Month',
                  },
                  {
                    const: '2_months',
                    title: '2 Months',
                  },
                  {
                    const: '3_months',
                    title: '3 Months',
                  },
                  {
                    const: '4_months',
                    title: '4 Months',
                  },
                  {
                    const: '5_months',
                    title: '5 Months',
                  },
                  {
                    const: '6_months',
                    title: '6 Months',
                  },
                  {
                    const: '7_months',
                    title: '7 Months',
                  },
                  {
                    const: '8_months',
                    title: '8 Months',
                  },
                  {
                    const: '9_months',
                    title: '9 Months',
                  },
                  {
                    const: '10_months',
                    title: '10 Months',
                  },
                  {
                    const: '11_months',
                    title: '11 Months',
                  },
                  {
                    const: '12_months',
                    title: '12 Months',
                  },
                ],
              },
            },
          },
          comments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  format: 'date',
                },
                enum: {
                  enum: ['foo', 'bar'],
                  type: 'string',
                },
                message: {
                  type: 'string',
                  maxLength: 5,
                },
              },
            },
          },
          providers: {
            type: 'object',
            properties: {
              primary: {
                type: 'string',
                oneOf: [
                  {
                    const: 'CITZ',
                    title: "Ministry of Citizens' Services",
                  },
                  {
                    const: 'MCFD',
                    title: 'Ministry of Children and Family Development',
                  },
                  {
                    const: 'SDPR',
                    title: 'Ministry of Social Development and Poverty Reduction',
                  },
                ],
              },
              secondary: {
                type: 'array',
                items: {
                  type: 'string',
                  oneOf: [
                    {
                      const: 'one',
                      title: 'One',
                    },
                    {
                      const: 'two',
                      title: 'Two',
                    },
                    {
                      const: 'three',
                      title: 'Three',
                    },
                    {
                      const: 'four',
                      title: 'Four',
                    },
                    {
                      const: 'five',
                      title: 'Five',
                    },
                  ],
                },
                uniqueItems: true,
              },
            },
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
              oneOf: [
                {
                  const: 'bc',
                  title: 'British Columbia',
                },
                {
                  const: 'ab',
                  title: 'Alberta',
                },
                {
                  const: 'on',
                  title: 'Ontario',
                },
              ],
            },
            uniqueItems: true,
          },
          life_events: {
            type: 'array',
            items: {
              type: 'string',
              oneOf: [
                {
                  const: 'cde45e12-449d-4e09-9a1c-325103c24e2c',
                  title: 'Becoming a parent/guardian',
                },
                {
                  const: '6d9ca452-2153-474b-b49d-5f9dd0395dc0',
                  title: 'Caregiving for an aging parent',
                },
                {
                  const: '9aa749f0-cf7b-4b9e-9e20-6c3c1cc0e895',
                  title: 'Changing name or identity',
                },
                {
                  const: '8065bea0-8493-404c-8adb-ff25c6131882',
                  title: 'Experiencing a natural disaster or emergency',
                },
                {
                  const: '64146ea5-25a0-4512-85f6-7fcdc9173464',
                  title: 'Getting approvals to use land or resources for a project',
                },
                {
                  const: 'a2039146-d075-437e-a9bc-14fe8b87a0d4',
                  title: 'Handling end-of-life arrangements',
                },
                {
                  const: '0e97efb4-65dd-4b83-b544-823f0aee151b',
                  title: 'Having a serious injury or living with a disability',
                },
                {
                  const: '1c0bfd2d-f131-4832-b465-b90d4aad4d4a',
                  title: 'Losing or looking for a job',
                },
                {
                  const: 'f9cc3b12-5341-49d1-bb18-f49cec4753aa',
                  title: 'Moving or immigrating to a new place',
                },
                {
                  const: '26abd974-2898-4894-b053-299bd235b748',
                  title: 'Navigating a crime or justice process',
                },
                {
                  const: '5aebc43b-7636-43d2-832b-af7de67affcd',
                  title: 'Returning to school or post-secondary',
                },
                {
                  const: 'da34c427-f6b5-4bc3-a68c-ed02dcdba4e5',
                  title: 'Seeking health care',
                },
                {
                  const: '5cc390e7-e61a-4176-87ee-8771ec962d32',
                  title: 'Seeking housing',
                },
                {
                  const: 'c317b914-0690-4820-8750-87ac8f25e22e',
                  title: 'Starting or expanding a business',
                },
              ],
            },
            uniqueItems: true,
          },
          long_description: {
            type: 'string',
            maxLength: 256,
          },
          short_description: {
            type: 'string',
            maxLength: 96,
          },
        },
        required: ['faq'],
      },
    },
  },
  uischema: {
    type: 'VerticalLayout',
    elements: [
      {
        type: 'Group',
        label: 'Service description',
        options: {
          description: 'Describe the service',
          // Windowed editing (feature 175): subtree mode — the console renders an Edit button
          // beside this heading and edits this Group's own children.
          edit: true,
        },
        elements: [
          {
            type: 'Categorization',
            options: {
              // Windowed editing (feature 176): render these categories as a step flow — a
              // collapsible step rail beside one category at a time, with a pinned save bar —
              // rather than the default tab strip. Remove this key to fall back to tabs.
              variant: 'flow',
            },
            elements: [
              {
                type: 'Category',
                label: 'Overview',
                elements: [
                  {
                    type: 'VerticalLayout',
                    elements: [
                      {
                        type: 'Group',
                        label: 'Name & description',
                        options: {
                          description: 'Lorem ipsum dolor sit amet...',
                        },
                        elements: [
                          {
                            type: 'Section',
                            elements: [
                              {
                                type: 'Control',
                                scope: '#/properties/details/properties/title',
                              },
                              {
                                type: 'Control',
                                scope: '#/properties/details/properties/short_description',
                              },
                              {
                                type: 'Control',
                                scope: '#/properties/details/properties/long_description',
                                options: {
                                  multi: true,
                                },
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'Group',
                        label: 'Service categories',
                        elements: [
                          {
                            type: 'Section',
                            elements: [
                              {
                                type: 'Control',
                                scope: '#/properties/details/properties/categories',
                                options: {
                                  display: 'select',
                                  combobox: true,
                                },
                              },
                              {
                                type: 'Control',
                                label: 'Connected life events',
                                scope: '#/properties/details/properties/life_events',
                                options: {
                                  display: 'select',
                                  combobox: true,
                                },
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'Group',
                        label: 'Providers',
                        elements: [
                          {
                            type: 'Section',
                            elements: [
                              {
                                type: 'Control',
                                label: 'Primary service provider',
                                scope:
                                  '#/properties/details/properties/providers/properties/primary',
                                options: {
                                  display: 'select',
                                  combobox: true,
                                },
                              },
                            ],
                          },
                          {
                            type: 'Section',
                            elements: [
                              {
                                type: 'Control',
                                label: 'External service providers',
                                scope:
                                  '#/properties/details/properties/providers/properties/secondary',
                                options: {
                                  display: 'select',
                                  combobox: true,
                                },
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'Group',
                        label: 'Service targets',
                        elements: [
                          {
                            type: 'Section',
                            elements: [
                              {
                                type: 'GridLayout',
                                options: {
                                  columns: 2,
                                },
                                elements: [
                                  {
                                    type: 'Control',
                                    label: 'Minimum cost of application',
                                    scope:
                                      '#/properties/details/properties/targets/properties/min_cost',
                                  },
                                  {
                                    type: 'Control',
                                    label: 'Maximum cost of application',
                                    scope:
                                      '#/properties/details/properties/targets/properties/max_cost',
                                    options: {
                                      placeholder: 0,
                                    },
                                  },
                                  {
                                    type: 'Control',
                                    label: 'Minimum time for service completion',
                                    scope:
                                      '#/properties/details/properties/targets/properties/min_wait_time',
                                    options: {
                                      display: 'select',
                                      combobox: true,
                                    },
                                  },
                                  {
                                    type: 'Control',
                                    label: 'Maximum time for service completion',
                                    scope:
                                      '#/properties/details/properties/targets/properties/max_wait_time',
                                    options: {
                                      display: 'select',
                                      combobox: true,
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'Category',
                label: 'Description',
                elements: [
                  {
                    type: 'Control',
                    label: '',
                    scope: '#/properties/details/properties/about',
                    options: {
                      format: 'richtext',
                    },
                  },
                ],
              },
              {
                type: 'Category',
                label: 'Resources',
                elements: [
                  {
                    type: 'VerticalLayout',
                    elements: [
                      {
                        type: 'Group',
                        label: 'FAQs',
                        elements: [
                          {
                            type: 'Control',
                            label: '',
                            scope: '#/properties/details/properties/faq',
                            options: {
                              format: 'accordion-group',
                              itemLabel: 'question',
                              defaultOpen: 'first',
                            },
                          },
                        ],
                      },
                      {
                        type: 'Group',
                        label: 'Guides and resources',
                        elements: [
                          {
                            type: 'Control',
                            scope: '#/properties/comments',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'Category',
                label: 'Contact Methods',
                elements: [
                  {
                    type: 'VerticalLayout',
                    elements: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'Group',
        label: 'Eligibility criteria',
        options: {
          description: 'Define the eligibility criteria.',
          // Windowed editing (feature 175): this Group carries no fields — its content lives
          // outside the schema — so it names a bespoke editor from the console's registry.
          edit: { editor: 'eligibility-criteria' },
        },
        elements: [],
      },
      {
        type: 'Group',
        label: 'Application methods',
        options: {
          description: 'Map the user journey.',
          // Windowed editing (feature 175): this Group carries no fields — its content lives
          // outside the schema — so it names a bespoke editor from the console's registry.
          edit: { editor: 'application-methods' },
        },
        elements: [],
      },
      {
        type: 'Group',
        label: 'Data & Privacy',
        options: {
          description: 'Set up service agreements.',
          // Windowed editing (feature 175): this Group carries no fields — its content lives
          // outside the schema — so it names a bespoke editor from the console's registry.
          edit: { editor: 'data-privacy' },
        },
        elements: [],
      },
    ],
  },
};
