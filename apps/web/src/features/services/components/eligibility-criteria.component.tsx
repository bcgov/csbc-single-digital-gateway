import React from "react";

export interface EligibilityCriterion {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

interface EligibilityCriteriaProps {
  criteria: EligibilityCriterion[];
}

export function EligibilityCriteria({ criteria }: EligibilityCriteriaProps) {
  return (
    <div className="flex flex-col gap-px bg-neutral-200 border-neutral-200 border">
      <div className="grid grid-cols-3 gap-px">
        {criteria.map((criterion) => (
          <React.Fragment key={criterion.title}>
            <div className="bg-white p-4">
              <div className="flex items-center gap-2 font-bold">
                {criterion.icon}
                <span>{criterion.title}</span>
              </div>
            </div>
            <div className="bg-white p-4 col-span-2">
              {criterion.description}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
