import type { JsonSchema } from '@jsonforms/core';
import type { FlowElement } from '../../types/elements';

/**
 * The Multi-Stage Template (doc 200 rules 12-13): a Flow that BRANCHES, so the canvas shows what a
 * multi-stage form actually looks like — a fork, two parallel paths, a merge, a second fork and a rejoin —
 * rather than a straight line that teaches nothing about the layout.
 *
 * Six `Stage`s and two `Condition`s (doc 199), nine edges, ranks 0-6:
 *
 *                       Applicant (0)
 *                            |
 *                    [Applicant type] (1)
 *              business /            \ default
 *              Business (2)        Individual (2)
 *                       \            /
 *                   Supporting information (3)
 *                            |
 *                  [Inspection needed] (4)
 *                   yes /          \ default
 *              Inspection (5)        |
 *                       \            /
 *                        Review (6)
 *
 * Positions are NOT authored: doc 198 derives every node's `y` from its longest path from a root and its
 * `x` from sibling order, which is exactly what makes the fork and merge above draw themselves.
 *
 * Each `Condition` is authored COMPLETE, as the UI would author it (doc 199 rule 26): every criterion names a
 * field that is genuinely UPSTREAM of the node, uses an operator that field's `controlKind` allows
 * (`choice` → equals; `boolean` → isTrue, which takes no value, so `value` stays an ABSENT key), and every
 * Condition has a DEFAULT path — an edge with no `sourceHandle` — without which `flowProblems` reports an error.
 * A criterion's `id` IS the `sourceHandle` of the edge leaving that branch.
 *
 * Ids are fixed `nanoid(8)`-shaped literals rather than generated ones, exactly as `../sample.ts` does it: the
 * template must be deterministic. Every Stage carries its required `options.id` (edges address it) and every Form
 * carries one too — optional in the type, but a Form without one cannot be deep linked (doc 197).
 */
const APPLICANT_STAGE = 'Sx4nD9pW';
const BUSINESS_STAGE = 'Kt7mB2vR';
const INDIVIDUAL_STAGE = 'Jd5yH8nF';
const SUPPORTING_STAGE = 'Zc5hJ8qL';
const INSPECTION_STAGE = 'Qw3eR7tY';
const REVIEW_STAGE = 'Lp9kM4xC';

const TYPE_CONDITION = 'Bn6vT1sA';
const INSPECTION_CONDITION = 'Gh2wE5uI';

/** A criterion's id is the `sourceHandle` of the edge that leaves its branch (doc 199 rule 10). */
const IS_BUSINESS = 'Yr8tU3oP';
const NEEDS_INSPECTION = 'Vm4zX7bN';

const DETAILS_FORM = 'Pm3wF6tY';
const BUSINESS_FORM = 'Nv9kG4bH';
const INDIVIDUAL_FORM = 'Wq2sE8dR';
const SUPPORTING_FORM = 'Tf6gY1hJ';
const INSPECTION_FORM = 'Ck3vB9nM';
const CONFIRM_FORM = 'Dq2rT7sX';

const FULL_NAME = 'aW8jE3nU';
const EMAIL = 'yL6pC1dK';
const APPLICANT_TYPE = 'iO4pA9sD';
const BUSINESS_NAME = 'fG7hJ2kL';
const BUSINESS_NUMBER = 'zX5cV8bN';
const MAILING_ADDRESS = 'qA3wS6eD';
const DETAILS = 'Rg4vM7zB';
const INSPECTION_NEEDED = 'tY9uI2oP';
const PREFERRED_DATE = 'hJ5kL8zX';
const CONFIRMED = 'Hs9bQ5xT';

export const FLOW_TEMPLATE_UISCHEMA: FlowElement = {
  type: 'Flow',
  label: 'Multi-stage form',
  options: {
    edges: [
      { id: 'e1', source: APPLICANT_STAGE, target: TYPE_CONDITION },
      // The criterion branch: `sourceHandle` names the criterion this edge leaves by.
      { id: 'e2', source: TYPE_CONDITION, target: BUSINESS_STAGE, sourceHandle: IS_BUSINESS },
      // No `sourceHandle` — the default path every Condition must have.
      { id: 'e3', source: TYPE_CONDITION, target: INDIVIDUAL_STAGE },
      { id: 'e4', source: BUSINESS_STAGE, target: SUPPORTING_STAGE },
      { id: 'e5', source: INDIVIDUAL_STAGE, target: SUPPORTING_STAGE },
      { id: 'e6', source: SUPPORTING_STAGE, target: INSPECTION_CONDITION },
      {
        id: 'e7',
        source: INSPECTION_CONDITION,
        target: INSPECTION_STAGE,
        sourceHandle: NEEDS_INSPECTION,
      },
      { id: 'e8', source: INSPECTION_CONDITION, target: REVIEW_STAGE },
      { id: 'e9', source: INSPECTION_STAGE, target: REVIEW_STAGE },
    ],
  },
  elements: [
    {
      type: 'Stage',
      label: 'Applicant',
      options: { id: APPLICANT_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'Your details',
          options: { id: DETAILS_FORM },
          elements: [
            { type: 'Control', scope: `#/properties/${FULL_NAME}` },
            { type: 'Control', scope: `#/properties/${EMAIL}` },
            { type: 'Control', scope: `#/properties/${APPLICANT_TYPE}` },
          ],
        },
      ],
    },
    {
      type: 'Condition',
      label: 'Applicant type',
      options: {
        id: TYPE_CONDITION,
        criteria: [
          { id: IS_BUSINESS, field: APPLICANT_TYPE, operator: 'equals', value: 'business' },
        ],
      },
    },
    {
      type: 'Stage',
      label: 'Business',
      options: { id: BUSINESS_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'About the business',
          options: { id: BUSINESS_FORM },
          elements: [
            { type: 'Control', scope: `#/properties/${BUSINESS_NAME}` },
            { type: 'Control', scope: `#/properties/${BUSINESS_NUMBER}` },
          ],
        },
      ],
    },
    {
      type: 'Stage',
      label: 'Individual',
      options: { id: INDIVIDUAL_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'About you',
          options: { id: INDIVIDUAL_FORM },
          elements: [{ type: 'Control', scope: `#/properties/${MAILING_ADDRESS}` }],
        },
      ],
    },
    {
      type: 'Stage',
      label: 'Supporting information',
      options: { id: SUPPORTING_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'Tell us more',
          options: { id: SUPPORTING_FORM },
          elements: [
            {
              type: 'Control',
              scope: `#/properties/${DETAILS}`,
              options: { component: 'textarea' },
            },
            { type: 'Control', scope: `#/properties/${INSPECTION_NEEDED}` },
          ],
        },
      ],
    },
    {
      type: 'Condition',
      label: 'Inspection needed',
      options: {
        id: INSPECTION_CONDITION,
        // `isTrue` takes no value, so `value` must stay an ABSENT key (exactOptionalPropertyTypes).
        criteria: [{ id: NEEDS_INSPECTION, field: INSPECTION_NEEDED, operator: 'isTrue' }],
      },
    },
    {
      type: 'Stage',
      label: 'Inspection',
      options: { id: INSPECTION_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'Book an inspection',
          options: { id: INSPECTION_FORM },
          elements: [{ type: 'Control', scope: `#/properties/${PREFERRED_DATE}` }],
        },
      ],
    },
    {
      type: 'Stage',
      label: 'Review',
      options: { id: REVIEW_STAGE },
      elements: [
        {
          type: 'Form',
          label: 'Confirm and submit',
          options: { id: CONFIRM_FORM },
          elements: [{ type: 'Control', scope: `#/properties/${CONFIRMED}` }],
        },
      ],
    },
  ],
};

export const FLOW_TEMPLATE_SCHEMA: JsonSchema = {
  type: 'object',
  properties: {
    [FULL_NAME]: { type: 'string', title: 'Full name', maxLength: 80 },
    [EMAIL]: { type: 'string', title: 'Email', maxLength: 120 },
    [APPLICANT_TYPE]: {
      type: 'string',
      title: 'Applying as',
      oneOf: [
        { const: 'individual', title: 'An individual' },
        { const: 'business', title: 'A business' },
      ],
    },
    [BUSINESS_NAME]: { type: 'string', title: 'Business name', maxLength: 120 },
    [BUSINESS_NUMBER]: { type: 'string', title: 'Business number', maxLength: 15 },
    [MAILING_ADDRESS]: { type: 'string', title: 'Mailing address', maxLength: 200 },
    [DETAILS]: { type: 'string', title: 'Anything else we should know?', maxLength: 500 },
    [INSPECTION_NEEDED]: {
      type: 'boolean',
      title: 'The work needs an on-site inspection',
    },
    [PREFERRED_DATE]: { type: 'string', title: 'Preferred date', maxLength: 40 },
    [CONFIRMED]: { type: 'boolean', title: 'The information I have given is correct' },
  },
};
