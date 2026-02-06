interface StepperProps {
  currentStep: number
  totalSteps: number
  steps: string[]
}

export default function Stepper({ currentStep, totalSteps, steps }: StepperProps) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8">
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep

          return (
            <div key={stepNumber} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isCompleted
                    ? 'bg-primary text-white'
                    : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>
              <span
                className={`mt-2 text-xs text-center hidden sm:block ${
                  isActive ? 'text-primary font-medium' : 'text-gray-500'
                }`}
              >
                {step}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile: show current step name */}
      <div className="sm:hidden text-center mt-4">
        <span className="text-sm font-medium text-primary">
          {steps[currentStep - 1]}
        </span>
      </div>
    </div>
  )
}
