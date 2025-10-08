import { useCallback, useEffect, useRef, useState } from "react";

interface UseSiteSettingsImageUploadProps {
  onUpload?: (url: string) => void;
  imageType?: 'main' | 'network' | 'about';
}

export function useSiteSettingsImageUpload({ onUpload, imageType }: UseSiteSettingsImageUploadProps = {}) {
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
        if (!file.type.startsWith("image/")) {
          console.error("Por favor, selecione apenas arquivos de imagem");
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          console.error("Arquivo muito grande. Tamanho máximo: 5MB");
          return;
        }

        setFileName(file.name);
        
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        previewRef.current = url;
        
        setIsUploading(true);
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('imageType', imageType || 'main');

          const response = await fetch('/admin/api/settings/upload-image', {
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
    [onUpload, imageType],
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
