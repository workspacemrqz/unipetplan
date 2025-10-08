import { useCallback, useEffect, useRef, useState } from "react";

interface UseNetworkUnitImageUploadProps {
  onUpload?: (url: string) => void;
  unitId?: string;
}

export function useNetworkUnitImageUpload({ onUpload, unitId }: UseNetworkUnitImageUploadProps = {}) {
  const previewRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleThumbnailClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Validar tipo de arquivo
        if (!file.type.startsWith("image/")) {
          console.error("Por favor, selecione apenas arquivos de imagem");
          return;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          console.error("Arquivo muito grande. Tamanho máximo: 5MB");
          return;
        }

        setFileName(file.name);
        
        // Criar preview URL para exibição
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewRef.current = url;
        
        // Fazer upload para o servidor
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('unitId', unitId || 'new');

          const response = await fetch('/admin/api/network-units/upload-image', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Erro ao fazer upload da imagem');
          }

          const data = await response.json();
          onUpload?.(data.imageUrl);
        } catch (error) {
          console.error('Erro ao fazer upload:', error);
          alert('Erro ao fazer upload da imagem. Por favor, tente novamente.');
        } finally {
          setIsUploading(false);
        }
      }
    },
    [onUpload, unitId],
  );

  const handleRemove = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileName(null);
    previewRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  return {
    previewUrl,
    fileName,
    fileInputRef,
    isUploading,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  };
}
