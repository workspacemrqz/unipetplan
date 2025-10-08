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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock } from "lucide-react";
import { useMobileViewport } from "@/hooks/use-mobile";

interface PasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: string;
  isLoading?: boolean;
}

export function PasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Verificação de Senha",
  description = "Digite a senha do administrador para continuar:",
  isLoading = false,
}: PasswordDialogProps) {
  const [password, setPassword] = React.useState("");
  const { isMobile } = useMobileViewport()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };

  const handleClose = () => {
    setPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-md"
        maxHeightMobile="max-h-[60vh]"
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
              <Lock className={isMobile 
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
        
        <form onSubmit={handleSubmit}>
          <div className={isMobile ? "space-y-6 mt-4" : "space-y-4"}>
            <div className="space-y-2">
              <Label 
                htmlFor="password"
                className={isMobile ? "text-base" : ""}
              >
                Senha do Administrador
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha..."
                disabled={isLoading}
                autoFocus
                className={isMobile ? "h-12 text-base" : ""}
              />
            </div>
          </div>
          
          <DialogFooter className={isMobile 
            ? "flex flex-col-reverse gap-3 mt-8" 
            : "flex-row justify-end space-x-2 mt-6"
          }>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className={isMobile ? "w-full h-12" : ""}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !password.trim()}
              className={`bg-destructive text-destructive-foreground ${
                isMobile ? "w-full h-12" : ""
              }`}
            >
              {isLoading ? "Verificando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
