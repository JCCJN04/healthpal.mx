import React from 'react';

interface Step {
  number: number;
  label: string;
  isActive: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps }) => {
  return (
    <div className="flex gap-0 w-full">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className={`
            flex-1 py-3 px-6 text-center font-medium
            ${index === 0 ? 'rounded-l-full' : ''}
            ${index === steps.length - 1 ? 'rounded-r-full' : ''}
            ${
              step.isActive
                ? 'bg-[#33C7BE] text-white'
                : 'bg-white text-[#33C7BE] border border-[#33C7BE]'
            }
          `}
        >
          <span className="text-sm">
            {step.number}. {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;
