import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNetworkUnitImageUpload } from "@/hooks/use-network-unit-image-upload";
import { ImagePlus, Upload, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface NetworkUnitImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  unitId?: string | undefined;
}

export function NetworkUnitImageUpload({ 
  value, 
  onChange, 
  className,
  placeholder = "Selecione uma imagem",
  unitId
}: NetworkUnitImageUploadProps) {
  const {
    previewUrl,
    fileName,
    fileInputRef,
    isUploading,
    handleThumbnailClick,
    handleFileChange,
    handleRemove,
  } = useNetworkUnitImageUpload({
    onUpload: (url) => {
      onChange?.(url);
    },
    unitId
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const fakeEvent = {
          target: {
            files: [file],
          },
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleFileChange(fakeEvent);
      }
    },
    [handleFileChange],
  );

  // Usar previewUrl se disponível, senão usar value (URL existente)
  const displayUrl = previewUrl || value;

  return (
    <div className={cn("w-full space-y-4", className)}>
      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {!displayUrl ? (
        <div
          onClick={handleThumbnailClick}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex h-48 w-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors",
            isDragging && "border-primary/50 bg-primary/5",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Fazendo upload...</p>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-background p-2 shadow-sm">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, GIF
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="group relative h-48 w-48 overflow-hidden rounded-lg border border-border">
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover transition-transform duration-300"
            />
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
            {!isUploading && (
              <>
                <div className="absolute inset-0 bg-[rgb(var(--overlay-black)/0.4)] opacity-0 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleThumbnailClick}
                    className="h-9 w-9 p-0"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
          {fileName && (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="truncate">{fileName}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
