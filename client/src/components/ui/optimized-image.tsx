import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useImageMonitoring } from '@/hooks/use-image-monitoring';

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  onError?: () => void;
  onLoad?: () => void;
  style?: React.CSSProperties;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  onError,
  onLoad,
  style,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    if (onError) {
      onError();
    }
  }, [onError]);

  const handleLoad = useCallback(() => {
    setHasError(false);
    setIsLoading(false);
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  useEffect(() => {
    if (!src) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [src]);

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
};

export default OptimizedImage;

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  onError?: (error: string) => void;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  loading = 'lazy',
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Image monitoring for optimization insights
  const { recordImageEvent } = useImageMonitoring();

  const handleError = useCallback(() => {
    if (!hasError && retryCount < 2) {
      console.warn(`Failed to load image (attempt ${retryCount + 1}): ${src}`);

      // Record failure event
      recordImageEvent({
        url: src,
        success: false,
        error: `Failed to load image (attempt ${retryCount + 1})`,
        timestamp: new Date()
      });

      // Retry with a small delay
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000);

      return;
    }

    // Final failure
    setIsLoading(false);
    setHasError(true);
    console.error(`Image failed to load: ${src}`);

    recordImageEvent({
      url: src,
      success: false,
      error: 'Image failed to load',
      timestamp: new Date()
    });

    onError?.(`Failed to load: ${src}`);
  }, [src, hasError, onError, retryCount, recordImageEvent]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    setRetryCount(0);

    // Record successful load event
    recordImageEvent({
      url: src,
      success: true,
      timestamp: new Date()
    });
  }, [src, recordImageEvent]);

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 animate-pulse rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-loading-200)' }}>
          <div className="text-sm text-muted">Carregando...</div>
        </div>
      )}

      {!hasError ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onError={handleError}
          onLoad={handleLoad}
          className={cn(
            'transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          {...props}
        />
      ) : (
        <div className="absolute inset-0 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--bg-loading-100)' }}>
          <div className="text-sm text-center text-muted">
            <div>Imagem não disponível</div>
            <div className="text-xs">{alt}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;