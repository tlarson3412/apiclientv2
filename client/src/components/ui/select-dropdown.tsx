"use client"

import * as React from "react"
import { ChevronDown, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SelectDropdownOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectDropdownProps {
  label?: string
  options?: SelectDropdownOption[]
  value?: string
  onValueChange?: (value: string) => void
  helper?: string
  errorState?: string
  className?: string
  disabled?: boolean
}

function SelectDropdown({
  label = "Label text",
  options = [],
  value,
  onValueChange,
  helper = "",
  errorState = "",
  className,
  disabled = false,
}: SelectDropdownProps) {
  const [open, setOpen] = React.useState(false)

  const selectedOption = options.find((option) => option.value === value)
  const hasError = !!errorState

  const borderColor = hasError 
    ? "border-status-error" 
    : open 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "flex items-center gap-3 h-10 w-full bg-surface border rounded pl-4 pr-3 py-2 transition-colors",
              borderColor,
              disabled && "opacity-50 cursor-not-allowed",
              !disabled && "cursor-pointer"
            )}
            data-testid="button-select-dropdown"
          >
            <span className={cn(
              "flex-1 text-left font-normal text-[16px] leading-6",
              selectedOption ? "text-label-vivid" : "text-label-muted"
            )}>
              {selectedOption ? selectedOption.label : label}
            </span>
            <ChevronDown className={cn(
              "h-5 w-5 text-label-mid shrink-0 transition-transform",
              open && "rotate-180"
            )} />
          </button>
        </PopoverTrigger>
        
        {options.length > 0 && (
          <PopoverContent 
            className="w-[--radix-popover-trigger-width] p-0 border border-utility-subdued bg-surface rounded overflow-hidden shadow-md"
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
                  data-testid={`select-option-${option.value}`}
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

export { SelectDropdown }
