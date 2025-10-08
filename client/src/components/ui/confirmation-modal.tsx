import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnhancedScrollLock } from '../../hooks/use-enhanced-scroll-lock';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  icon?: ReactNode;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  isLoading = false,
  icon
}: ConfirmationModalProps) {
  // Use the body scroll lock hook
  useEnhancedScrollLock(isOpen);

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleOverlayClick}
    >
             {/* Overlay */}
       <div className="absolute inset-0 bg-[rgb(var(--overlay-black)/0.8)]" />
      
             {/* Modal */}
       <div className="relative rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200 border" style={{background: 'var(--bg-teal)'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0 text-[var(--text-light)]">
                {icon}
              </div>
            )}
            <h2 className="text-lg font-semibold text-[var(--text-light)]">
              {title}
            </h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-[var(--text-light)] transition-colors disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[var(--text-light)] leading-relaxed">
            {message}
          </p>
          <p className="text-sm text-[var(--text-light)] mt-2">
            Esta ação é irreversível.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
            style={{
              background: 'var(--bg-gold)',
              color: 'var(--text-light)',
              borderColor: 'var(--bg-gold)'
            }}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
            style={{
              background: 'var(--bg-teal-dark)',
              color: 'var(--text-light)'
            }}
          >
            {isLoading ? "Processando..." : confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}