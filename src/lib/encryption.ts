/**
 * Simple obfuscation for localStorage (NOT true encryption)
 * For a frontend-only app, this provides basic obfuscation
 * True security requires a backend
 * 
 * WARNING: This is obfuscation, not encryption. Determined attackers
 * can still extract the data. Use only for defense-in-depth.
 */

// In a real application, this should come from environment variables
// For now, using a simple key (not secure, but better than plain text)
const ENCRYPTION_KEY = 'lead-hub-2024-key';

function simpleObfuscate(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(char ^ keyChar);
  }
  return btoa(result); // Base64 encode
}

function simpleDeobfuscate(obfuscated: string): string {
  try {
    const decoded = atob(obfuscated);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const char = decoded.charCodeAt(i);
      const keyChar = ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(char ^ keyChar);
    }
    return result;
  } catch {
    return '';
  }
}

export function encryptForStorage(data: string): string {
  if (!data) return '';
  return simpleObfuscate(data);
}

export function decryptFromStorage(encrypted: string): string {
  if (!encrypted) return '';
  return simpleDeobfuscate(encrypted);
}

