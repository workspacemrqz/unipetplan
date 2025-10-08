import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a URL-friendly slug from a given text
 * 
 * @param text - The input text to convert to slug
 * @returns A clean, URL-friendly slug
 * 
 * @example
 * generateSlug("ANIMAL'S PETS") // returns "animalspets"
 * generateSlug("Centro Veterinário São José") // returns "centro-veterinario-sao-jose"
 * generateSlug("Clínica & Pets - Unidade Norte!") // returns "clinica-pets-unidade-norte"
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents)
    .replace(/^(\w+)['']s\s+(\w+)$/g, '$1s$2') // Handle specific possessive cases like "animal's pets" -> "animalspets" (only full match)
    .replace(/[''`]/g, '') // Remove remaining apostrophes and similar characters
    .replace(/[^a-z0-9\s-]/g, '') // Remove all non-alphanumeric characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace one or more spaces with a single hyphen
    .replace(/-+/g, '-') // Replace multiple consecutive hyphens with a single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
}

/**
 * Validates if a slug meets the basic requirements
 * 
 * @param slug - The slug to validate
 * @returns True if the slug is valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false
  
  // Should only contain lowercase letters, numbers, and hyphens
  const validPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  return validPattern.test(slug)
}
