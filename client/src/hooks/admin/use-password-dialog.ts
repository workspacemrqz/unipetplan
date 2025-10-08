import { useState, useCallback, useRef } from "react";

interface PasswordDialogOptions {
  title?: string;
  description?: string;
  onConfirm: (password: string) => Promise<void> | void;
}

export function usePasswordDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  
  // Use ref to always have the latest onConfirm callback
  const onConfirmRef = useRef<((password: string) => Promise<void> | void) | null>(null);

  const openDialog = useCallback((options: PasswordDialogOptions) => {
    setTitle(options.title);
    setDescription(options.description);
    onConfirmRef.current = options.onConfirm;
    setIsOpen(true);
    setIsLoading(false);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setIsLoading(false);
    onConfirmRef.current = null;
  }, []);

  const confirm = useCallback(async (password: string) => {
    if (onConfirmRef.current && !isLoading) {
      setIsLoading(true);
      try {
        await onConfirmRef.current(password);
      } finally {
        // Loading will be managed by the caller
        // Don't set loading to false here as the caller controls it
      }
    }
  }, [isLoading]);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    isOpen,
    title,
    description,
    isLoading,
    openDialog,
    closeDialog,
    confirm,
    setLoading: setLoadingState,
  };
}
