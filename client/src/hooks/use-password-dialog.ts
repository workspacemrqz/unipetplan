import { useState, useCallback } from "react";

interface PasswordDialogState {
  isOpen: boolean;
  title?: string;
  description?: string;
  onConfirm?: (password: string) => void;
  isLoading?: boolean;
}

export function usePasswordDialog() {
  const [state, setState] = useState<PasswordDialogState>({
    isOpen: false,
  });

  const openDialog = useCallback((options: Omit<PasswordDialogState, 'isOpen'>) => {
    setState({
      isOpen: true,
      title: options.title,
      description: options.description,
      onConfirm: options.onConfirm,
      isLoading: options.isLoading || false,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const confirm = useCallback((password: string) => {
    if (state.onConfirm) {
      state.onConfirm(password);
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
    isLoading: state.isLoading,
    openDialog,
    closeDialog,
    confirm,
    setLoading,
  };
}
