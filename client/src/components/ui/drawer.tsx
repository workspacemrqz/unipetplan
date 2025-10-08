"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { useMobileViewport, useSafeArea } from "@/hooks/use-mobile"

import { cn } from "@/lib/utils"

const Drawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-[rgb(var(--overlay-black)/0.8)]", className)}
    {...props}
  />
))
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    maxHeight?: string
    showHandle?: boolean
  }
>(({ className, children, maxHeight, showHandle = true, ...props }, ref) => {
  const { isMobile, viewport } = useMobileViewport()
  const safeArea = useSafeArea()
  
  const getMaxHeight = () => {
    if (maxHeight) return maxHeight
    
    if (viewport === 'mobile') {
      // Consider safe area for mobile devices with notches
      const bottomSafeArea = safeArea.bottom > 0 ? safeArea.bottom : 0
      return `calc(90vh - ${bottomSafeArea}px)`
    } else if (viewport === 'tablet') {
      return '80vh'
    } else {
      return '70vh'
    }
  }
  
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        ref={ref}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[10px] border bg-background",
          // Responsive max height
          "transition-all duration-300 ease-in-out",
          // Add safe area padding if needed
          safeArea.bottom > 0 ? `pb-[${safeArea.bottom}px]` : "",
          className
        )}
        style={{
          maxHeight: getMaxHeight(),
          ...props.style
        }}
        {...props}
      >
        {showHandle && (
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted flex-shrink-0" />
        )}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
})
DrawerContent.displayName = "DrawerContent"

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useMobileViewport()
  
  return (
    <div
      className={cn(
        "grid gap-1.5 text-center sm:text-left flex-shrink-0",
        isMobile ? "p-4" : "p-6",
        className
      )}
      {...props}
    />
  )
}
DrawerHeader.displayName = "DrawerHeader"

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useMobileViewport()
  
  return (
    <div
      className={cn(
        "flex flex-col gap-2 flex-shrink-0",
        isMobile ? "p-4" : "p-6",
        className
      )}
      {...props}
    />
  )
}
DrawerFooter.displayName = "DrawerFooter"

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
