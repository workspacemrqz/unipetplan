"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useMobileViewport, useSafeArea } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-[rgb(var(--overlay-black)/0.8)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    mobileFullscreen?: boolean
    maxHeightMobile?: string
    hideCloseButton?: boolean
  }
>(({ className, children, mobileFullscreen = false, maxHeightMobile, hideCloseButton = false, ...props }, ref) => {
  const { isMobile, viewport } = useMobileViewport()
  const safeArea = useSafeArea()
  
  // Calculate responsive classes based on viewport
  const getResponsiveClasses = () => {
    const baseClasses = [
      // Base positioning and z-index
      "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
      // Layout and styling
      "grid gap-4 border bg-background shadow-lg duration-200",
      // Scroll handling for overflow content
      "overflow-y-auto",
      // Animations
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
      "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
    ]
    
    if (viewport === 'mobile') {
      if (mobileFullscreen) {
        return [
          ...baseClasses,
          // Fullscreen mobile with safe area consideration
          "w-screen h-screen max-w-none max-h-none",
          "rounded-none",
          "p-4",
          // Safe area padding if available
          safeArea.top > 0 ? `pt-[calc(1rem+${safeArea.top}px)]` : "pt-4",
          safeArea.bottom > 0 ? `pb-[calc(1rem+${safeArea.bottom}px)]` : "pb-4",
          safeArea.left > 0 ? `pl-[calc(1rem+${safeArea.left}px)]` : "pl-4",
          safeArea.right > 0 ? `pr-[calc(1rem+${safeArea.right}px)]` : "pr-4"
        ]
      } else {
        return [
          ...baseClasses,
          // Mobile responsive sizing with proper centering
          "w-[calc(100vw-2rem)] max-w-none",
          // Maintain default center positioning and add margins
          "mx-4",
          // Dynamic max height based on prop or default - more conservative
          maxHeightMobile || "max-h-[calc(100vh-6rem)]",
          // Mobile padding
          "p-4",
          // Rounded corners for mobile
          "rounded-lg"
        ]
      }
    } else if (viewport === 'tablet') {
      return [
        ...baseClasses,
        // Tablet sizing
        "w-[calc(100vw-4rem)] max-w-2xl mx-8 my-8",
        "max-h-[calc(100vh-6rem)]",
        "p-6",
        "rounded-lg"
      ]
    } else {
      return [
        ...baseClasses,
        // Desktop sizing - increased width for better readability with proper height constraints
        "max-w-2xl w-full",
        "max-h-[calc(100vh-8rem)]", // Conservative height to ensure dialogs fit within viewport
        "p-6",
        "rounded-lg"
      ]
    }
  }
  
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(...getResponsiveClasses(), className)}
        {...props}
      >
        {children}
        {!hideCloseButton && (
          <DialogPrimitive.Close className={cn(
            "absolute rounded-sm opacity-70",
            "disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
            // Responsive close button positioning
            isMobile ? "right-3 top-3" : "right-4 top-4"
          )}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useMobileViewport()
  
  return (
    <div
      className={cn(
        // Mobile: Stack buttons vertically with reverse order (cancel button on top)
        // Desktop: Horizontal layout with standard order
        isMobile 
          ? "flex flex-col-reverse gap-2" 
          : "flex flex-row justify-end space-x-2",
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
