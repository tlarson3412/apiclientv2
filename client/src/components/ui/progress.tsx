import * as React from "react"
import { cn } from "@/lib/utils"

interface ContinuousProgressProps {
  type?: "continuous"
  value?: number
  showLabel?: boolean
  className?: string
}

interface SteppedProgressProps {
  type: "stepped"
  currentStep?: number
  steps?: string[]
  onStepClick?: (stepIndex: number) => void
  className?: string
}

type ProgressProps = ContinuousProgressProps | SteppedProgressProps

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (props, ref) => {
    if (props.type === "stepped") {
      return <SteppedProgress {...props} ref={ref} />
    }
    return <ContinuousProgress {...props} ref={ref} />
  }
)
Progress.displayName = "Progress"

const ContinuousProgress = React.forwardRef<HTMLDivElement, ContinuousProgressProps>(
  ({ value = 0, showLabel = true, className, ...props }, ref) => {
    const clampedValue = Math.min(100, Math.max(0, value))
    
    return (
      <div ref={ref} className={cn("flex flex-col items-center gap-2", className)} {...props}>
        <div className="relative flex items-center w-full">
          <div className="w-3 h-3 rounded-full bg-standard-subdued border-2 border-surface shrink-0 z-10" />
          
          <div className="flex-1 h-1 relative -mx-1">
            <div className="absolute inset-0 bg-utility-subdued" />
            <div 
              className="absolute left-0 top-0 h-full bg-standard-subdued rounded-r-sm transition-all duration-300"
              style={{ width: `${clampedValue}%` }}
            />
          </div>
          
          <div className="w-3 h-3 rounded-full bg-utility-subdued border-2 border-surface shrink-0 z-10" />
        </div>
        
        {showLabel && (
          <p className="text-[12px] leading-[15px] text-label-muted tracking-[0.24px] text-center">
            {clampedValue}% complete
          </p>
        )}
      </div>
    )
  }
)
ContinuousProgress.displayName = "ContinuousProgress"

const SteppedProgress = React.forwardRef<HTMLDivElement, SteppedProgressProps>(
  ({ currentStep = 1, steps = ["Stop 1", "Stop 2", "Stop 3"], onStepClick, className, ...props }, ref) => {
    const totalSteps = steps.length
    
    return (
      <div ref={ref} className={cn("flex flex-col gap-2 w-full", className)} {...props}>
        <div className="flex items-center w-full">
          <div 
            className={cn(
              "w-3 h-3 rounded-full shrink-0 z-10 border-2 border-surface",
              currentStep >= 1 ? "bg-standard-subdued" : "bg-utility-subdued"
            )}
          />
          
          {steps.slice(1).map((_, index) => {
            const stepIndex = index + 2
            const isCompleted = currentStep >= stepIndex
            const isCurrent = currentStep === stepIndex
            
            return (
              <div key={index} className="flex-1 flex items-center">
                <div 
                  className={cn(
                    "flex-1 h-1",
                    isCompleted || isCurrent ? "bg-standard-subdued" : "bg-utility-subdued"
                  )}
                />
                
                {isCurrent ? (
                  <div className="w-3 h-3 rounded-full bg-standard-subdued shrink-0 z-10 ring-2 ring-standard-subdued ring-offset-2 ring-offset-surface" />
                ) : (
                  <div 
                    className={cn(
                      "w-3 h-3 rounded-full shrink-0 z-10 border-2 border-surface",
                      isCompleted ? "bg-standard-subdued" : "bg-utility-subdued"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
        
        <div className="flex items-start justify-between w-full">
          {steps.map((label, index) => {
            const stepIndex = index + 1
            
            return (
              <div key={index} className="flex-1 flex items-center justify-center">
                <button
                  onClick={() => onStepClick?.(stepIndex)}
                  className="text-[12px] leading-[15px] text-utility-vivid underline font-medium hover:opacity-80 transition-opacity"
                  data-testid={`progress-step-${stepIndex}`}
                >
                  {label}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
SteppedProgress.displayName = "SteppedProgress"

export { Progress }
