/**
 * Utility function to construct canonical image URLs (production compatible)
 */
export async function getImageUrl(imagePath: string | null | undefined, fallback?: string): Promise<string> {
  if (!imagePath) {
    return fallback || '/placeholder-image.svg';
  }

  // If it's already a complete URL (http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it doesn't start with /objects/ and /api/objects/, return as is (local static files)
  if (!imagePath.startsWith('/objects/') && !imagePath.startsWith('/api/objects/')) {
    // Ensure the path starts with / for public folder access
    if (!imagePath.startsWith('/')) {
      imagePath = '/' + imagePath;
    }
    return imagePath;
  }

  // If it's already a canonical API path, return as relative URL
  if (imagePath.startsWith('/api/objects/') && imagePath.endsWith('/image')) {
    return imagePath;
  }

  // Map legacy/object-style paths to the canonical API image endpoint that
  // resolves the correct file (including extension) from metadata.
  if (imagePath.startsWith('/objects/uploads/')) {
    const objectId = imagePath.replace('/objects/uploads/', '').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    return `/api/objects/${objectId}/image`;
  }

  if (imagePath.startsWith('/objects/')) {
    const objectId = imagePath.replace('/objects/', '').replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    return `/api/objects/${objectId}/image`;
  }

  // Fallback to original path as relative
  return imagePath;
}

/**
 * Synchronous version that returns relative URLs for production compatibility
 */
export function getImageUrlSync(imagePath: string | null | undefined, fallback?: string): string {
  if (!imagePath) {
    return fallback || '/placeholder-image.svg';
  }

  // If it's already a complete URL (http/https), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // For local static files, ensure they start with /
  if (!imagePath.startsWith('/')) {
    imagePath = '/' + imagePath;
  }

  // Return the path as is for local files
  return imagePath;
}

/**
 * Enhanced image component with error handling and fallbacks
 */
export function getImageWithFallback(
  imagePath: string | null | undefined, 
  fallback: string,
  onError?: (error: string) => void
): string {
  try {
    const url = getImageUrlSync(imagePath, fallback);
    
    // Validate URL format
    if (!url || url === '') {
      console.warn('Empty image URL, using fallback:', fallback);
      return fallback;
    }
    
    return url;
  } catch (error) {
    console.error('Error processing image URL:', error);
    if (onError) {
      onError('Erro ao processar imagem');
    }
    return fallback;
  }
}

/**
 * Check if an image URL is valid and accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('Image validation failed:', error);
    return false;
  }
}

// Image compression removed - now using Supabase Storage only