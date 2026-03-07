"use client"

import * as React from "react"
import { AlertTriangle, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
  disabled?: boolean
}

export interface ComboboxProps {
  label?: string
  children?: React.ReactNode
  options?: ComboboxOption[]
  value?: string
  onValueChange?: (value: string) => void
  helper?: string
  tooltip?: boolean
  errorState?: string
  className?: string
  disabled?: boolean
}

function Combobox({
  label,
  children,
  options = [],
  value,
  onValueChange,
  helper = "",
  tooltip = false,
  errorState = "",
  className,
  disabled = false,
}: ComboboxProps) {
  const displayLabel = children || label || "Label text"
  const [open, setOpen] = React.useState(false)
  const [internalFocus, setInternalFocus] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)
  const isFocused = internalFocus || open
  const hasValue = !!selectedOption
  const hasError = !!errorState

  const borderColor = hasError 
    ? "border-status-error" 
    : isFocused 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <Popover open={open && options.length > 0} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            onFocus={() => setInternalFocus(true)}
            onBlur={() => setInternalFocus(false)}
            className={cn(
              "flex flex-col items-start w-full bg-transparent border-b transition-colors relative",
              hasValue ? "pt-0 pb-1" : "pt-[18px]",
              borderColor,
              disabled && "opacity-50 cursor-not-allowed",
              !disabled && "cursor-pointer"
            )}
            data-testid="button-combobox-trigger"
          >
            {hasValue && (
              <span className="text-[12px] leading-4 text-label-mid mb-1">
                {displayLabel}
              </span>
            )}
            <div className="flex items-center justify-between w-full py-px">
              <span className={cn(
                "font-normal text-[16px] leading-6",
                hasValue ? "text-label-vivid" : "text-label-mid"
              )}>
                {hasValue ? selectedOption.label : displayLabel}
              </span>
              {tooltip && (
                <HelpCircle className="h-5 w-5 text-utility-mid shrink-0" />
              )}
            </div>
          </button>
        </PopoverTrigger>
        
        {options.length > 0 && (
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0 border border-utility-subdued bg-surface rounded overflow-hidden shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12),0px_2px_4px_-1px_rgba(0,0,0,0.12)]"
            align="start"
          >
            <div className="flex flex-col">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => {
                    if (!option.disabled) {
                      onValueChange?.(option.value === value ? "" : option.value)
                      setOpen(false)
                    }
                  }}
                  disabled={option.disabled}
                  className={cn(
                    "flex flex-col justify-center px-2 pt-3 pb-[13px] text-left text-[16px] leading-6 bg-surface transition-all duration-150",
                    index < options.length - 1 && "border-b border-utility-subdued",
                    "hover:bg-standard-muted hover:pl-3",
                    option.disabled && "opacity-50 cursor-not-allowed"
                  )}
                  data-testid={`combobox-option-${option.value}`}
                >
                  <span className="text-label-vivid">{option.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        )}
      </Popover>

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

export { Combobox }
