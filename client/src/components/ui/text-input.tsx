"use client"

import * as React from "react"
import { AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TextInputProps {
  label?: string
  value?: string
  onValueChange?: (value: string) => void
  helper?: string
  tooltip?: boolean
  errorState?: string
  className?: string
  disabled?: boolean
  type?: string
}

function TextInput({
  label = "Label text",
  value = "",
  onValueChange,
  helper = "",
  tooltip = false,
  errorState = "",
  className,
  disabled = false,
  type = "text",
}: TextInputProps) {
  const [internalValue, setInternalValue] = React.useState(value)
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  const hasValue = !!internalValue
  const hasError = !!errorState

  const borderColor = hasError 
    ? "border-status-error" 
    : isFocused 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <div
        className={cn(
          "flex flex-col items-start w-full bg-transparent border-b transition-colors relative",
          hasValue || isFocused ? "pt-0 pb-1" : "pt-[18px]",
          borderColor,
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {(hasValue || isFocused) && (
          <span className="text-[12px] leading-4 text-label-mid mb-1">
            {label}
          </span>
        )}
        <div className="flex items-center justify-between w-full py-px">
          <input
            type={type}
            value={internalValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            placeholder={hasValue || isFocused ? "" : label}
            className={cn(
              "flex-1 bg-transparent font-normal text-[16px] leading-6 outline-none",
              hasValue ? "text-label-vivid" : "text-label-mid",
              "placeholder:text-label-mid",
              disabled && "cursor-not-allowed"
            )}
            data-testid="input-text"
          />
          {tooltip && (
            <HelpCircle className="h-5 w-5 text-utility-mid shrink-0 ml-2" />
          )}
        </div>
      </div>

      {helper && !hasError && (
        <p className="text-[12px] leading-4 text-label-muted">
          {helper}
        </p>
      )}

      {hasError && (
        <p className="text-[12px] font-normal text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          {errorState}
        </p>
      )}
    </div>
  )
}

export { TextInput }
