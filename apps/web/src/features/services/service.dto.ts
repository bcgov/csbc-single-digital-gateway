import { z } from "zod";

export const BaseItemDto = z.object({
  id: z.uuid(),
  label: z.string(),
  description: z.string().optional(),
});

export type BaseItemDto = z.infer<typeof BaseItemDto>;

export const AddressItemDto = BaseItemDto.extend({
  type: z.literal("address"),
  addressOne: z.string(),
  addressTwo: z.string().optional(),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
  country: z.string(),
});

export type AddressItemDto = z.infer<typeof AddressItemDto>;

export const LinkItemDto = BaseItemDto.extend({
  type: z.literal("link"),
  url: z.url(),
});

export type LinkItemDto = z.infer<typeof LinkItemDto>;

export const PhoneItemDto = BaseItemDto.extend({
  type: z.literal("phone"),
  value: z.string(),
});

export type PhoneItemDto = z.infer<typeof PhoneItemDto>;

export const FaxItemDto = BaseItemDto.extend({
  type: z.literal("fax"),
  value: z.string(),
});

export type FaxItemDto = z.infer<typeof FaxItemDto>;

export const ValueItemDto = BaseItemDto.extend({
  type: z.literal("value"),
  value: z.string(),
});
export type ValueItemDto = z.infer<typeof ValueItemDto>;

export const ItemDto = z.discriminatedUnion("type", [
  AddressItemDto,
  LinkItemDto,
  PhoneItemDto,
  FaxItemDto,
  ValueItemDto,
]);

const BaseApplicationDto = z.object({
  id: z.uuid(),
  label: z.string(),
  description: z.string().optional(),
});

export const ServiceApplicationExternalDto = BaseApplicationDto.extend({
  type: z.literal("external"),
});

export type ServiceApplicationExternalDto = z.infer<
  typeof ServiceApplicationExternalDto
>;

export const isExternalApplication = (
  application: ServiceApplicationDto,
): application is ServiceApplicationExternalDto =>
  application.type === "external";

export const ServiceApplicationWorkflowDto = BaseApplicationDto.extend({
  type: z.literal("workflow"),
  config: z
    .object({
      apiKey: z.string(),
      tenantId: z.uuid(),
      triggerUrl: z.url(),
    })
    .optional(),
});

export type ServiceApplicationWorkflowDto = z.infer<
  typeof ServiceApplicationWorkflowDto
>;

export const isWorkflowApplication = (
  application: ServiceApplicationDto,
): application is ServiceApplicationWorkflowDto =>
  application.type === "workflow";

export const ServiceApplicationDto = z.discriminatedUnion("type", [
  ServiceApplicationExternalDto,
  ServiceApplicationWorkflowDto,
]);

export type ServiceApplicationDto = z.infer<typeof ServiceApplicationDto>;

export const ServiceApplicationsDto = z
  .array(ServiceApplicationDto)
  .default([]);

export const ServiceConsentDocumentDto = z.object({});

export type ServiceConsentDocumentDto = z.infer<
  typeof ServiceConsentDocumentDto
>;

export const ServiceContactMethodsDto = z.array(ItemDto).default([]);

export const ServiceResourceDto = z.object({
  legal: z.array(LinkItemDto),
  otherServices: z.object({
    recommendedServices: z.array(LinkItemDto),
    relatedServices: z.array(LinkItemDto),
  }),
  recommendedReading: z.array(LinkItemDto),
});

export type ServiceResourceDto = z.infer<typeof ServiceResourceDto>;

export const ServiceDto = z.object({
  id: z.uuid(),
  serviceTypeId: z.uuid().nullable().optional(),
  orgUnitId: z.uuid().nullable().optional(),
  versionId: z.uuid().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  locale: z.string().nullable().optional(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  content: z
    .object({
      // Applications
      applications: ServiceApplicationsDto,
      // Details
      about: z.string().optional(),
      audience: z.string().optional(),
      considerations: z.string().optional(),
      outcomes: z.string().optional(),
      // Contact Methods
      contactMethods: ServiceContactMethodsDto,
      // Resources
      faq: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          }),
        )
        .optional(),
      // Settings
      consents: z.array(ServiceConsentDocumentDto).default([]),
      resources: ServiceResourceDto.default({
        legal: [],
        otherServices: { recommendedServices: [], relatedServices: [] },
        recommendedReading: [],
      }),
    })
    .optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceDto = z.infer<typeof ServiceDto>;

// export const ApplicationDto = z.object({
//   id: z.string(),
//   label: z.string(),
//   description: z.string().nullable().optional(),
//   apiKey: z.string().optional(),
//   formId: z.string().optional(),
//   method: z.enum(["GET", "POST"]).optional(),
//   url: z.string().url(),
//   blockName: z.string().nullable().optional(),
//   blockType: z.enum(["form", "workflow"]).optional(),
// });

// export type ApplicationDto = z.infer<typeof ApplicationDto>;

// export const RichTextDto = z.record(z.string(), z.unknown());

// export const ApplicationSupportItemDto = z.object({
//   id: z.string(),
//   label: z.string(),
//   description: z.string().nullable().optional(),
//   value: z.string().url(),
// });

// export const AddressDto = z.object({
//   id: z.string(),
//   label: z.string().optional(),
//   description: z.string().nullable().optional(),
//   addressOne: z.string().optional(),
//   addressTwo: z.string().optional(),
//   city: z.string().optional(),
//   province: z.string().optional(),
//   country: z.string().optional(),
// });

// export const LegalItemDto = z.object({
//   id: z.string(),
//   label: z.string(),
//   value: z.string().url(),
// });

// export const ValueItemDto = z.object({
//   id: z.string(),
//   label: z.string().optional(),
//   description: z.string().nullable().optional(),
//   value: z.string().optional(),
// });

// export const LinkItemDto = z.object({
//   id: z.string(),
//   label: z.string(),
//   url: z.string().url(),
//   description: z.string().nullable().optional(),
// });

// export const ContactMethodsDto = z.object({
//   address: z.array(AddressDto).optional(),
//   email: z.array(ValueItemDto).optional(),
//   fax: z.array(ValueItemDto).optional(),
//   phone: z.array(ValueItemDto).optional(),
//   web: z.array(ValueItemDto).optional(),
// });

// export const ApplicationBlockDto = z.object({
//   id: z.string(),
//   blockName: z.string().nullable().optional(),
//   blockType: z.enum(["form", "workflow"]).optional(),
//   online: z.array(ApplicationDto).default([]),
//   download: z.array(ApplicationDto).optional(),
// });

// export const ServiceDto = z.object({
//   id: z.uuid(),
//   organizationId: z.string().optional(),
//   versionId: z.string().optional(),
//   name: z.string().min(1).max(255),
//   description: z.string().nullable().optional(),
//   // content: z.record(z.string(), z.unknown()).optional(),
//   content: z
//     .object({
//       short: z.string().optional(),
//       long: z.string().optional(),
//     })
//     .nullable()
//     .optional(),
//   categories: z.array(z.string()).optional(),

//   application: z
//     .object({
//       description: RichTextDto.nullable().optional(),
//       applications: z.array(ApplicationBlockDto).optional(),
//     })
//     .optional(),

//   faq: z
//     .array(
//       z.object({
//         id: z.string(),
//         question: z.string(),
//         answer: z.string(),
//       }),
//     )
//     .optional(),

//   contactMethods: ContactMethodsDto.optional(),

//   resources: z
//     .object({
//       applicationSupport: z.array(ApplicationSupportItemDto).optional(),
//       contactMethods: ContactMethodsDto.optional(),
//       legal: z.array(LegalItemDto).optional(),
//       otherServices: z
//         .object({
//           recommendedServices: z.array(z.unknown()).optional(),
//           relatedServices: z.array(z.unknown()).optional(),
//         })
//         .optional(),
//       recommendedReading: z.array(LinkItemDto).optional(),
//     })
//     .optional(),

//   publishedAt: z.string().optional(),
//   updatedAt: z.string().optional(),
//   createdAt: z.string().optional(),

//   settings: z
//     .object({
//       contributors: z
//         .object({
//           docs: z.array(z.unknown()).optional(),
//           hasNextPage: z.boolean().optional(),
//         })
//         .optional(),
//       consent: z
//         .array(
//           z.object({
//             id: z.string(),
//             documentId: z.string(),
//           }),
//         )
//         .optional(),
//       delegate: z
//         .object({
//           access: z.boolean().optional(),
//         })
//         .optional(),
//     })
//     .optional(),
// });

// export type ServiceDto = z.infer<typeof ServiceDto>;
