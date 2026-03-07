"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  label?: string
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  helper?: string
  errorState?: string
  className?: string
  disabled?: boolean
  dateFormat?: string
}

function DatePicker({
  label = "Choose date",
  date,
  onDateChange,
  placeholder = "mm/dd/yyyy",
  helper = "",
  errorState = "",
  className,
  disabled = false,
  dateFormat = "MM/dd/yyyy",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalFocus, setInternalFocus] = React.useState(false)

  const isFocused = internalFocus || open
  const hasValue = !!date
  const hasError = !!errorState

  const borderColor = hasError 
    ? "border-status-error" 
    : isFocused 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
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
            data-testid="button-date-picker"
          >
            {hasValue && (
              <span className="text-[12px] leading-4 text-label-mid mb-1">
                {label}
              </span>
            )}
            <div className="flex items-center justify-between w-full py-px">
              <span className={cn(
                "font-normal text-[16px] leading-6",
                hasValue ? "text-label-vivid" : "text-label-mid"
              )}>
                {hasValue ? format(date, dateFormat) : label}
              </span>
              <CalendarIcon className="h-5 w-5 text-utility-mid shrink-0" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 border border-utility-subdued bg-surface rounded overflow-hidden shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12),0px_2px_4px_-1px_rgba(0,0,0,0.12)]" 
          align="start"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              onDateChange?.(newDate)
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
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

export interface DateRangePickerProps {
  label?: string
  dateFrom?: Date
  dateTo?: Date
  onDateRangeChange?: (from: Date | undefined, to: Date | undefined) => void
  placeholder?: string
  helper?: string
  errorState?: string
  className?: string
  disabled?: boolean
  dateFormat?: string
}

function DateRangePicker({
  label = "Choose date range",
  dateFrom,
  dateTo,
  onDateRangeChange,
  placeholder = "mm/dd/yyyy - mm/dd/yyyy",
  helper = "",
  errorState = "",
  className,
  disabled = false,
  dateFormat = "MM/dd/yyyy",
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [internalFocus, setInternalFocus] = React.useState(false)

  const isFocused = internalFocus || open
  const hasValue = !!dateFrom
  const hasError = !!errorState

  const borderColor = hasError 
    ? "border-status-error" 
    : isFocused 
      ? "border-standard-subdued" 
      : "border-utility-mid"

  const displayValue = dateFrom 
    ? dateTo 
      ? `${format(dateFrom, dateFormat)} - ${format(dateTo, dateFormat)}`
      : format(dateFrom, dateFormat)
    : label

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
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
            data-testid="button-date-range-picker"
          >
            {hasValue && (
              <span className="text-[12px] leading-4 text-label-mid mb-1">
                {label}
              </span>
            )}
            <div className="flex items-center justify-between w-full py-px">
              <span className={cn(
                "font-normal text-[16px] leading-6",
                hasValue ? "text-label-vivid" : "text-label-mid"
              )}>
                {displayValue}
              </span>
              <CalendarIcon className="h-5 w-5 text-utility-mid shrink-0" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0 border border-utility-subdued bg-surface rounded overflow-hidden shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.12),0px_2px_4px_-1px_rgba(0,0,0,0.12)]" 
          align="start"
        >
          <Calendar
            mode="range"
            selected={{ from: dateFrom, to: dateTo }}
            onSelect={(range) => {
              onDateRangeChange?.(range?.from, range?.to)
            }}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
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

export { DatePicker, DateRangePicker }
