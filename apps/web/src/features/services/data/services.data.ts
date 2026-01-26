import type { ServiceDto } from "../service.dto";

export const services: ServiceDto[] = [
  {
    id: "2f8c9g5h-4d3b-5e6f-0g1h-2i3j4k5l6m7n",
    name: "Income & Disability Assistance",
    slug: "income-disability-assistance-8f3a2c1d",
    description:
      "Financial support for individuals and families in need, including income assistance for basic needs and disability assistance for those with medical conditions affecting their ability to work.",
    tags: ["assistance"],
    eligibility: [
      "Must be a BC resident",
      "Must be 19 years of age or older",
      "Must demonstrate financial need",
      "For disability assistance: must have a medical condition that significantly restricts ability to work",
    ],
    applications: [
      {
        id: "bcc7a548-1100-432d-82a3-5c0901574a0b",
        name: "Income Assistance",
        apiKey: "83688c02-59d7-49fc-a25a-462895e37a13",
        baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
      },
      {
        id: "bcc7a548-1100-432d-82a3-5c0901574a0b",
        name: "Disability Assistance",
        apiKey: "83688c02-59d7-49fc-a25a-462895e37a13",
        baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/app",
      },
    ],
  },
];
