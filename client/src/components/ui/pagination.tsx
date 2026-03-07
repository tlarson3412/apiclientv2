import * as React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

interface PaginationProps {
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  className?: string
}

const Pagination = ({ 
  currentPage = 1, 
  totalPages = 3, 
  onPageChange,
  className 
}: PaginationProps) => {
  const canGoPrevious = currentPage > 1
  const canGoNext = currentPage < totalPages

  const handlePrevious = () => {
    if (canGoPrevious && onPageChange) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (canGoNext && onPageChange) {
      onPageChange(currentPage + 1)
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="text-[16px] leading-6 text-label-mid font-normal pr-2">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        aria-label="Go to previous page"
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded transition-colors",
          canGoPrevious 
            ? "text-label-vivid hover:bg-surface-alternate-muted cursor-pointer" 
            : "text-disabled-foreground cursor-not-allowed"
        )}
        data-testid="pagination-previous"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <button
        onClick={handleNext}
        disabled={!canGoNext}
        aria-label="Go to next page"
        className={cn(
          "flex items-center justify-center w-11 h-11 rounded transition-colors",
          canGoNext 
            ? "text-label-vivid hover:bg-surface-alternate-muted cursor-pointer" 
            : "text-disabled-foreground cursor-not-allowed"
        )}
        data-testid="pagination-next"
      >
        <ArrowRight className="w-5 h-5" />
      </button>
    </nav>
  )
}
Pagination.displayName = "Pagination"

export {
  Pagination,
}
