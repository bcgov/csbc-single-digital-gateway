// Placeholder file for hardcoded text

import { IconCake } from "@tabler/icons-react";
import type { EligibilityCriterion } from "./eligibility-criteria.component";

export const eligibilityCriteria: EligibilityCriterion[] = [
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Age",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Income Assistance is designed to support adults who are legally able
          to enter into agreements and manage financial assistance.
        </p>
        <p>Eligibility is based on the following factors:</p>
        <ul className="list-disc list-inside">
          <li>To start the application: 17.5 years and above</li>
          <li>To be eligible for the program: 18 years and above</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Citizenship",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Income Assistance is funded by the Province of British Columbia and is
          available to people who have legal status in Canada that allows access
          to provincial services.
        </p>
        <p>
          You may be eligible if you meet at least one of the following
          criteria:
        </p>
        <ol className="list-decimal list-inside">
          <li>Citizen, or permanent resident, or</li>
          <li>Valid work permit holder, or</li>
          <li>Refugee or protected person</li>
        </ol>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Residency",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Residency requirements help determine which provincial services you
          can access and how benefits are delivered.
        </p>
        <p>You may be eligible if you meet all of the following criteria:</p>
        <ul className="list-disc list-inside">
          <li>Living in any community within British Columbia, and</li>
          <li>You live off-reserve, and</li>
          <li>You've lived in BC for a minimum of 3 years</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Shelter status",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Your housing situation helps determine both eligibility and the type
          and amount of assistance you may receive.
        </p>
        <p>
          You may be eligible if you meet at least one of the following
          criteria:
        </p>
        <ol className="list-decimal list-inside">
          <li>Home owner</li>
          <li>Renter</li>
          <li>Living in subsidized housing</li>
          <li>Unhoused, or</li>
          <li>Staying in temporary accommodation</li>
        </ol>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Employment status",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Income Assistance is intended to support people who are not currently
          able to meet basic needs through employment.
        </p>
        <p>You may be eligible if the following applies to you:</p>
        <ul className="list-disc list-inside">
          <li>Unemployed</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Income level",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Income Assistance is based on financial need. Your income helps
          determine whether you qualify and the amount of support you may
          receive. Your income must be below set limits.
        </p>
        <p>Eligibility is based on the following factors:</p>
        <ul className="list-disc list-inside">
          <li>Individual income: Up to $5,000</li>
          <li>Household income: Up to $10,000</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Marital status",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          Your marital or family situation is used to understand household size,
          shared income, and support needs. Your household composition may
          affect eligibility and benefit amounts.
        </p>
        <p>
          You may be eligible if you meet at least one of the following
          criteria:
        </p>
        <ul className="list-disc list-inside">
          <li>Single</li>
          <li>Married</li>
          <li>Living common-law</li>
          <li>Separated, or</li>
          <li>Divorced</li>
        </ul>
      </div>
    ),
  },
  {
    icon: <IconCake size={16} stroke={1.5} />,
    title: "Other factors",
    description: (
      <div className="flex flex-col gap-1">
        <p>
          You may be eligible if you find yourself in any of these situations:
        </p>
        <ul className="list-disc list-inside">
          <li>
            You're out of work or not earning enough to meet your basic needs
          </li>
          <li>You're waiting for other sources of money to arrive</li>
          <li>You can't work at all</li>
          <li>You urgently need food, shelter or medical attention</li>
          <li>
            The ministry can only give available resources to people who meet
            eligibility criteria. You must look for and use all other sources of
            income and assets before you apply.
          </li>
        </ul>
      </div>
    ),
  },
];
