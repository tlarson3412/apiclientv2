import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

export interface TextareaProps {
  label?: string
  helper?: string
  errorState?: string
  maxLength?: number
  showCharCount?: boolean
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  disabled?: boolean
  rows?: number
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label = "Message",
    helper,
    errorState,
    maxLength,
    showCharCount = false,
    value,
    onValueChange,
    className,
    disabled = false,
    rows = 4,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    const [isFocused, setIsFocused] = React.useState(false)
    
    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])
    
    const currentValue = value !== undefined ? value : internalValue
    const charCount = currentValue.length
    const charsRemaining = maxLength ? maxLength - charCount : null
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (maxLength && newValue.length > maxLength) {
        return
      }
      setInternalValue(newValue)
      onValueChange?.(newValue)
    }

    const hasValue = currentValue.length > 0
    const showFloatingLabel = hasValue || isFocused

    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <div 
          className={cn(
            "relative px-3 py-3 rounded bg-surface border transition-colors",
            errorState ? "border-status-error" : "border-utility-mid",
            isFocused && !errorState && "ring-2 ring-standard-subdued ring-offset-2",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {showFloatingLabel && (
            <span className="absolute top-2 left-3 text-[12px] leading-4 text-label-mid">
              {label}
            </span>
          )}
          <textarea
            ref={ref}
            value={currentValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            rows={rows}
            placeholder={showFloatingLabel ? "" : label}
            className={cn(
              "w-full bg-transparent text-[16px] leading-6 text-label-vivid placeholder:text-label-muted focus:outline-none resize-none",
              showFloatingLabel && "mt-4"
            )}
            data-testid="input-textarea"
            {...props}
          />
        </div>
        
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            {errorState ? (
              <p className="text-[12px] leading-[20px] tracking-[0.24px] text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {errorState}
              </p>
            ) : helper ? (
              <p className="text-[12px] leading-[20px] tracking-[0.24px] text-label-muted">
                {helper}
              </p>
            ) : null}
          </div>
          
          {showCharCount && maxLength && (
            <span className={cn(
              "text-[12px] leading-[20px] tracking-[0.24px] shrink-0",
              charsRemaining !== null && charsRemaining <= 10 ? "text-destructive" : "text-label-muted"
            )}>
              {charsRemaining} characters remaining
            </span>
          )}
        </div>
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
