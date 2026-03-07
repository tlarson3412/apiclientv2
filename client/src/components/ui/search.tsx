import * as React from "react"
import { Search as SearchIcon, X, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface SearchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
  helper?: string
  errorState?: string
  showSearchButton?: boolean
  showClearButton?: boolean
  onClear?: () => void
  onSearch?: () => void
}

const Search = React.forwardRef<HTMLInputElement, SearchProps>(
  ({ 
    className, 
    label = "Search",
    helper,
    errorState,
    showSearchButton = false,
    showClearButton = true,
    onClear, 
    onSearch,
    value, 
    placeholder,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value || "")
    const [isFocused, setIsFocused] = React.useState(false)
    const hasValue = (value !== undefined ? value : internalValue) !== ""
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value)
      props.onChange?.(e)
    }
    
    const handleClear = () => {
      setInternalValue("")
      onClear?.()
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSearch) {
        onSearch()
      }
      props.onKeyDown?.(e)
    }

    return (
      <div className={cn("flex gap-3 items-start", className)}>
        <div className="flex-1 flex flex-col gap-1 relative">
          <div 
            className={cn(
              "relative flex items-center gap-3 px-3 py-2 rounded bg-surface border transition-colors",
              errorState ? "border-status-error" : "border-utility-mid",
              isFocused && !errorState && "ring-2 ring-standard-subdued ring-offset-2"
            )}
          >
            <SearchIcon className="w-5 h-5 text-label-vivid shrink-0" />
            
            <input
              type="text"
              ref={ref}
              value={value !== undefined ? value : internalValue}
              onChange={handleChange}
              onFocus={(e) => {
                setIsFocused(true)
                props.onFocus?.(e)
              }}
              onBlur={(e) => {
                setIsFocused(false)
                props.onBlur?.(e)
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || label}
              className="flex-1 h-6 bg-transparent text-[16px] leading-6 text-label-vivid placeholder:text-label-muted focus:outline-none"
              data-testid="input-search"
              {...props}
            />
            
            {showClearButton && hasValue && (
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 text-utility-vivid hover:text-label-vivid transition-colors"
                data-testid="button-search-clear"
              >
                <X className="w-5 h-5" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          
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
        
        {showSearchButton && (
          <Button 
            variant="primary" 
            size="medium"
            onClick={onSearch}
            data-testid="button-search-submit"
          >
            Search
          </Button>
        )}
      </div>
    )
  }
)
Search.displayName = "Search"

export { Search }
