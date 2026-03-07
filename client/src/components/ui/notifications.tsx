import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const NotificationProvider = ToastPrimitives.Provider;

const NotificationViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
NotificationViewport.displayName = ToastPrimitives.Viewport.displayName;

const notificationVariants = cva(
  "group pointer-events-auto relative flex w-full flex-col overflow-hidden rounded transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full shadow-[0px_1px_3px_0px_rgba(0,0,0,0.12)]",
  {
    variants: {
      variant: {
        default: "bg-surface border-l border-r border-b border-utility-subdued",
        info: "bg-status-info-muted border-l border-r border-b border-status-info-subdued",
        success:
          "bg-status-success-muted border-l border-r border-b border-status-success-subdued",
        caution:
          "bg-status-caution-muted border-l border-r border-b border-status-caution-subdued",
        danger:
          "bg-status-danger-muted border-l border-r border-b border-status-danger-subdued",
        warning:
          "bg-status-caution-muted border-l border-r border-b border-status-caution-subdued",
        error:
          "bg-status-danger-muted border-l border-r border-b border-status-danger-subdued",
        destructive:
          "bg-status-danger-muted border-l border-r border-b border-status-danger-subdued",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const headerColorMap: Record<string, string> = {
  default: "bg-utility-mid",
  info: "bg-status-info-mid",
  success: "bg-status-success-mid",
  caution: "bg-status-caution-mid",
  danger: "bg-status-danger-mid",
  warning: "bg-status-caution-mid",
  error: "bg-status-danger-mid",
  destructive: "bg-status-danger-mid",
};

const iconColorMap: Record<string, string> = {
  default: "text-utility-vivid",
  info: "text-status-info-mid",
  success: "text-status-success-mid",
  caution: "text-status-caution-mid",
  danger: "text-status-danger-mid",
  warning: "text-status-caution-mid",
  error: "text-status-danger-mid",
  destructive: "text-status-danger-mid",
};

const notificationIcons = {
  default: Info,
  info: Info,
  success: CheckCircle,
  caution: AlertTriangle,
  danger: AlertCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  destructive: AlertCircle,
};

const Notification = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof notificationVariants>
>(({ className, variant = "info", children, ...props }, ref) => {
  const Icon = notificationIcons[variant || "info"];
  const headerColor = headerColorMap[variant || "info"];
  const iconColor = iconColorMap[variant || "info"];

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(notificationVariants({ variant }), className)}
      {...props}
    >
      <div className={cn("h-1 w-full rounded-t", headerColor)} />
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <Icon className={cn("h-5 w-5 shrink-0", iconColor)} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </ToastPrimitives.Root>
  );
});
Notification.displayName = ToastPrimitives.Root.displayName;

const NotificationAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
NotificationAction.displayName = ToastPrimitives.Action.displayName;

const NotificationClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-md p-1 text-label-mid opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-5 w-5" />
  </ToastPrimitives.Close>
));
NotificationClose.displayName = ToastPrimitives.Close.displayName;

const NotificationTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-[14px] leading-[21px] text-label-vivid", className)}
    {...props}
  />
));
NotificationTitle.displayName = ToastPrimitives.Title.displayName;

const NotificationDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-[14px] leading-[21px] text-label-mid", className)}
    {...props}
  />
));
NotificationDescription.displayName = ToastPrimitives.Description.displayName;

type NotificationProps = React.ComponentPropsWithoutRef<typeof Notification>;

type NotificationActionElement = React.ReactElement<typeof NotificationAction>;

function Notifications() {
  const { toasts } = useToast();

  return (
    <NotificationProvider>
      {toasts.map(function ({
        id,
        title,
        description,
        action,
        variant,
        ...props
      }) {
        return (
          <Notification key={id} variant={variant} {...props}>
            <div className="grid gap-1 pr-6">
              {title && <NotificationTitle>{title}</NotificationTitle>}
              {description && (
                <NotificationDescription>{description}</NotificationDescription>
              )}
            </div>
            {action}
            <NotificationClose />
          </Notification>
        );
      })}
      <NotificationViewport />
    </NotificationProvider>
  );
}

export {
  type NotificationProps,
  type NotificationActionElement,
  NotificationProvider,
  NotificationViewport,
  Notification,
  NotificationTitle,
  NotificationDescription,
  NotificationClose,
  NotificationAction,
  Notifications,
  notificationVariants,
};
