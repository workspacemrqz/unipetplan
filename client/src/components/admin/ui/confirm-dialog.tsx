import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useMobileViewport } from "@/hooks/use-mobile";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
  confirmText = "Excluir",
  cancelText = "Cancelar",
  isLoading = false,
}: ConfirmDialogProps) {
  const { isMobile } = useMobileViewport()
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        maxHeightMobile="max-h-[50vh]"
      >
        <DialogHeader>
          <div className={isMobile 
            ? "flex flex-col space-y-3" 
            : "flex items-center space-x-3"
          }>
            <div className={isMobile 
              ? "flex justify-center" 
              : "flex-shrink-0"
            }>
              <AlertTriangle className={isMobile 
                ? "h-8 w-8 text-destructive" 
                : "h-6 w-6 text-destructive"
              } />
            </div>
            <div className={isMobile ? "text-center" : ""}>
              <DialogTitle className="text-foreground">{title}</DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <DialogFooter className={isMobile 
          ? "flex flex-col-reverse gap-3 mt-6" 
          : "flex-row justify-end space-x-2"
        }>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className={isMobile ? "w-full" : ""}
          >
            {cancelText}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className={`bg-destructive hover:bg-destructive/90 text-destructive-foreground ${
              isMobile ? "w-full" : ""
            }`}
          >
            {isLoading ? "Excluindo..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
