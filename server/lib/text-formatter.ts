/**
 * Text formatting utilities for backend data normalization
 * Ensures consistent data storage with proper capitalization
 */

/**
 * Capitalizes the first letter of each word in a string and converts the rest to lowercase.
 * Properly handles Brazilian Portuguese characters with accents.
 * 
 * @param str - The string to capitalize
 * @returns The formatted string with first letter of each word capitalized
 * 
 * @example
 * capitalizeFirst("MARIA DA SILVA") // "Maria Da Silva"
 * capitalizeFirst("são paulo") // "São Paulo"
 * capitalizeFirst("josé andré") // "José André"
 */
export function capitalizeFirst(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      
      // Normalize to handle accented characters properly
      const normalized = word.normalize('NFD');
      const firstChar = normalized.charAt(0).toUpperCase();
      const rest = normalized.slice(1);
      
      // Recompose the string to preserve accents
      return (firstChar + rest).normalize('NFC');
    })
    .join(' ');
}

/**
 * Normalizes text fields for database storage
 * Applies capitalizeFirst and trims whitespace
 * 
 * @param value - The value to normalize
 * @returns The normalized value
 */
export function normalizeTextField(value: string | null | undefined): string {
  if (!value) return '';
  return capitalizeFirst(value.trim());
}

/**
 * Normalizes multiple text fields in an object
 * Useful for normalizing client/pet data before database insertion
 * 
 * @param obj - The object with text fields to normalize
 * @param fields - Array of field names to normalize
 * @returns A new object with normalized fields
 */
export function normalizeTextFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const normalized = { ...obj };
  
  for (const field of fields) {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalizeTextField(normalized[field] as string) as T[keyof T];
    }
  }
  
  return normalized;
}
