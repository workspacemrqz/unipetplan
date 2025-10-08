"use client"

import React, { useState, useCallback } from 'react';
import { getImageUrlSync } from '@/lib/image-utils';

interface RobustImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onError?: (error: string) => void;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

export function RobustImage({
  src,
  alt,
  className = '',
  width,
  height,
  onError,
  onLoad,
  style,
  ...props
}: RobustImageProps) {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
    if (onError) {
      onError('Falha ao carregar imagem');
    }
  }, [onError]);

  const handleLoad = useCallback(() => {
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  if (!src || hasError) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

export default RobustImage;
