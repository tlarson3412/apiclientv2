"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { AlertTriangle, ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectInputOption {
  value: string
  label: string
}

export interface SelectInputProps {
  label?: string
  value?: string
  onValueChange?: (value: string) => void
  options?: SelectInputOption[]
  helper?: string
  tooltip?: boolean
  errorState?: string
  className?: string
  disabled?: boolean
  placeholder?: string
}

function SelectInput({
  label = "Label text",
  value = "",
  onValueChange,
  options = [],
  helper = "",
  tooltip = false,
  errorState = "",
  className,
  disabled = false,
  placeholder,
}: SelectInputProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const hasValue = !!value
  const hasError = !!errorState
  const selectedOption = options.find(opt => opt.value === value)

  const borderColor = hasError 
    ? "border-status-error" 
    : isOpen 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        onOpenChange={setIsOpen}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex flex-col items-start w-full bg-transparent border-b transition-colors relative outline-none",
            hasValue || isOpen ? "pt-0 pb-1" : "pt-[18px]",
            borderColor,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          data-testid="select-trigger"
        >
          {(hasValue || isOpen) && (
            <span className="text-[12px] leading-4 text-label-mid mb-1">
              {label}
            </span>
          )}
          <div className="flex items-center justify-between w-full py-px">
            <span
              className={cn(
                "flex-1 text-left font-normal text-[16px] leading-6",
                hasValue ? "text-label-vivid" : "text-label-mid"
              )}
            >
              {hasValue ? selectedOption?.label : (placeholder || label)}
            </span>
            <SelectPrimitive.Icon asChild>
              <ChevronDown className={cn(
                "h-5 w-5 text-utility-mid shrink-0 transition-transform",
                isOpen && "rotate-180"
              )} />
            </SelectPrimitive.Icon>
          </div>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="relative z-50 max-h-[300px] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-md border border-utility-mid bg-surface shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-[16px] text-label-vivid outline-none hover:bg-surface-alternate-muted focus:bg-surface-alternate-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  data-testid={`select-option-${option.value}`}
                >
                  <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4 text-standard-subdued" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

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

export { SelectInput }
