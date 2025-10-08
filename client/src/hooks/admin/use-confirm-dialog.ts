import { useState, useCallback } from "react";

interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isLoading?: boolean;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
  });

  const openDialog = useCallback((options: Omit<ConfirmDialogState, 'isOpen'>) => {
    setState({
      isOpen: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      onConfirm: options.onConfirm,
      isLoading: options.isLoading || false,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const confirm = useCallback(() => {
    if (state.onConfirm) {
      state.onConfirm();
    }
    closeDialog();
  }, [state.onConfirm, closeDialog]);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  return {
    isOpen: state.isOpen,
    title: state.title,
    description: state.description,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    isLoading: state.isLoading,
    openDialog,
    closeDialog,
    confirm,
    setLoading,
  };
}
