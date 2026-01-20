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
        id: "3145c95c-337e-41e5-836c-138cf1256bc9",
        name: "Income Assistance",
        apiKey: "a7464f97-9377-42ee-9f73-7c2d4250c132",
        baseUrl: "https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1802",
      },
      {
        id: "264d7b4d-e05b-4791-99e7-33f3009716e3",
        name: "Disability Assistance",
        apiKey: "",
        baseUrl: "",
      },
    ],
  },
];
