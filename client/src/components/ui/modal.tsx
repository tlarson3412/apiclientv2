"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Link } from "@/components/ui/link"

const Modal = DialogPrimitive.Root

const ModalTrigger = DialogPrimitive.Trigger

const ModalPortal = DialogPrimitive.Portal

const ModalClose = DialogPrimitive.Close

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[470px] translate-x-[-50%] translate-y-[-50%] gap-4 border border-utility-subdued bg-surface p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 flex items-center justify-center w-10 h-10 rounded-md border border-utility-subdued bg-transparent transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-5 w-5 text-label-vivid" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ModalPortal>
))
ModalContent.displayName = DialogPrimitive.Content.displayName

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-left pr-12",
      className
    )}
    {...props}
  />
)
ModalHeader.displayName = "ModalHeader"

const ModalBody = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "border-2 border-dashed border-utility-subdued rounded-md p-4 bg-surface-muted",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
ModalBody.displayName = "ModalBody"

interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  buttonCount?: 1 | 2 | 3
  primaryLabel?: string
  secondaryLabel?: string
  linkLabel?: string
  onPrimaryClick?: () => void
  onSecondaryClick?: () => void
  onLinkClick?: () => void
}

const ModalFooter = ({
  className,
  buttonCount = 3,
  primaryLabel = "Label text",
  secondaryLabel = "Label text",
  linkLabel = "Label text",
  onPrimaryClick,
  onSecondaryClick,
  onLinkClick,
  ...props
}: ModalFooterProps) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3 pt-2 bg-surface-alternate-muted -mx-6 -mb-6 px-6 py-4 rounded-b-lg",
      className
    )}
    {...props}
  >
    {buttonCount === 3 ? (
      <Link href="#" linkType="basic" onClick={onLinkClick} data-testid="modal-link-button">
        {linkLabel}
      </Link>
    ) : (
      <div />
    )}
    <div className="flex items-center gap-3">
      {buttonCount >= 2 && (
        <Button variant="secondary" onClick={onSecondaryClick} data-testid="modal-secondary-button">
          {secondaryLabel}
        </Button>
      )}
      <Button variant="primary" onClick={onPrimaryClick} data-testid="modal-primary-button">
        {primaryLabel}
      </Button>
    </div>
  </div>
)
ModalFooter.displayName = "ModalFooter"

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-[24px] font-semibold leading-tight text-label-vivid",
      className
    )}
    {...props}
  />
))
ModalTitle.displayName = DialogPrimitive.Title.displayName

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[16px] text-label-subdued", className)}
    {...props}
  />
))
ModalDescription.displayName = DialogPrimitive.Description.displayName

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalTitle,
  ModalDescription,
}
