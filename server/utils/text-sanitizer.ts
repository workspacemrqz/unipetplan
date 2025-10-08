/**
 * Utilitário para sanitização de texto usando sanitize-html (Node.js compatible)
 */

import sanitizeHtml from 'sanitize-html';

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Normalizar quebras de linha para \n
  let sanitized = text
    .replace(/\r\n/g, '\n')  // Windows line breaks
    .replace(/\r/g, '\n');    // Mac line breaks

  // Use sanitize-html for robust XSS protection (Node.js compatible)
  // SECURITY: Only allow safe, semantic tags - no generic containers or deprecated tags
  sanitized = sanitizeHtml(sanitized, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    selfClosing: ['br'],
    transformTags: {
      'a': (tagName, attribs) => {
        // Garantir que links externos abram em nova aba com segurança
        return {
          tagName,
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        };
      }
    }
  });

  // Preservar quebras de linha e espaços múltiplos
  sanitized = sanitized
    .replace(/\n\s*\n/g, '\n\n')  // Normalizar múltiplas quebras
    .replace(/[ \t]+/g, ' ')       // Normalizar espaços múltiplos
    .trim();

  return sanitized;
}

export function sanitizeChatMessage(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // More restrictive sanitization for chat messages
  // SECURITY: Chat messages only allow basic formatting, no links or lists
  const sanitized = sanitizeHtml(text, {
    allowedTags: ['br', 'p', 'strong', 'em'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
    selfClosing: ['br']
  });

  return sanitized.substring(0, 2000); // Limit message length
}

export function validateTextLength(text: string, maxLength: number): boolean {
  if (!text) return true;
  
  // Contar caracteres incluindo quebras de linha
  const normalizedText = text.replace(/\r\n|\r|\n/g, '\n');
  return normalizedText.length <= maxLength;
}

export function getTextStats(text: string): {
  characters: number;
  lines: number;
  words: number;
} {
  if (!text) {
    return { characters: 0, lines: 0, words: 0 };
  }

  const normalizedText = text.replace(/\r\n|\r|\n/g, '\n');
  const lines = normalizedText.split('\n');
  
  return {
    characters: normalizedText.length,
    lines: lines.length,
    words: normalizedText.split(/\s+/).filter(word => word.length > 0).length
  };
}
