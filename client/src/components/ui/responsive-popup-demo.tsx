import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PasswordDialog } from "@/components/ui/password-dialog";
import { useMobileViewport } from "@/hooks/use-mobile";

export function ResponsivePopupDemo() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const { viewport, isMobile } = useMobileViewport();

  const handleConfirm = () => {
    console.log("Item confirmado para exclusão");
    setConfirmOpen(false);
  };

  const handlePasswordConfirm = (password: string) => {
    console.log("Senha inserida:", password);
    setPasswordOpen(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Demo: Popups Responsivos</h1>
        <p className="text-muted-foreground">
          Viewport atual: <span className="font-semibold">{viewport}</span>
          {isMobile && " (Mobile otimizado)"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dialog Responsivo */}
        <div className="space-y-3">
          <h3 className="font-medium">Dialog Responsivo</h3>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" className="w-full">
                Abrir Dialog
              </Button>
            </DialogTrigger>
            <DialogContent maxHeightMobile="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Dialog Responsivo</DialogTitle>
                <DialogDescription>
                  Este dialog se adapta automaticamente ao tamanho da tela. Em mobile,
                  ele terá margens adequadas e altura controlada.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  Em mobile, os botões ficam empilhados verticalmente e ocupam
                  toda a largura para facilitar o toque.
                </p>
              </div>
              <DialogFooter>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogTrigger>
                <Button>Confirmar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Confirm Dialog */}
        <div className="space-y-3">
          <h3 className="font-medium">Confirm Dialog</h3>
          <Button 
            variant="destructive" 
            onClick={() => setConfirmOpen(true)}
            className="w-full"
          >
            Excluir Item
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            onConfirm={handleConfirm}
            title="Confirmar Exclusão"
            description="Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."
          />
        </div>

        {/* Password Dialog */}
        <div className="space-y-3">
          <h3 className="font-medium">Password Dialog</h3>
          <Button 
            onClick={() => setPasswordOpen(true)}
            className="w-full"
          >
            Verificar Senha
          </Button>
          <PasswordDialog
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
            onConfirm={handlePasswordConfirm}
            title="Autenticação Necessária"
            description="Digite sua senha de administrador para continuar:"
          />
        </div>

        {/* Responsive Popover */}
        <div className="space-y-3">
          <h3 className="font-medium">Popover Responsivo</h3>
          <ResponsivePopover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <ResponsivePopoverTrigger asChild>
              <Button variant="default" className="w-full">
                Abrir Popover
              </Button>
            </ResponsivePopoverTrigger>
            <PopoverContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Popover Inteligente</h4>
                  <p className="text-sm text-muted-foreground">
                    Em desktop, este é um popover normal. Em mobile, 
                    converte automaticamente para um drawer.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPopoverOpen(false)}>
                    Fechar
                  </Button>
                  <Button size="sm" variant="outline">
                    Ação
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </ResponsivePopover>
        </div>

        {/* Sheet Responsivo */}
        <div className="space-y-3">
          <h3 className="font-medium">Sheet Responsivo</h3>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="default" className="w-full">
                Abrir Sheet
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Sheet Otimizado</SheetTitle>
                <SheetDescription>
                  Este sheet se adapta ao viewport: largura reduzida em mobile,
                  média em tablet, e fixa em desktop.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Campo de exemplo</label>
                  <input 
                    className="w-full mt-1 p-2 border rounded" 
                    placeholder="Digite algo..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Outro campo</label>
                  <textarea 
                    className="w-full mt-1 p-2 border rounded h-20" 
                    placeholder="Mais texto..."
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-auto">
                <Button className="flex-1">Salvar</Button>
                <Button variant="outline" className="flex-1">Cancelar</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Informações do Viewport */}
        <div className="space-y-3 md:col-span-2 lg:col-span-3">
          <h3 className="font-medium">Informações do Viewport</h3>
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Viewport:</strong> {viewport}
              </div>
              <div>
                <strong>Mobile:</strong> {isMobile ? 'Sim' : 'Não'}
              </div>
              <div>
                <strong>Largura:</strong> {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px
              </div>
              <div>
                <strong>Altura:</strong> {typeof window !== 'undefined' ? window.innerHeight : 'N/A'}px
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Redimensione a janela ou use DevTools para testar a responsividade.
          Em dispositivos móveis, os popups terão comportamento otimizado.
        </p>
      </div>
    </div>
  );
}