// Configuration for n8n webhook endpoints
// Webhook URLs are now fixed in code per requirements

import { configSchema, type AppConfig } from './configSchema';
import { encryptForStorage, decryptFromStorage } from './encryption';
import { hashPassword } from './auth';

const STORAGE_KEY = 'leadProcessorConfig';
const ENCRYPTED_KEY = 'leadProcessorConfigEnc';

// Fixed webhook endpoints (do not expose in UI)
const DEFAULT_CONFIG: AppConfig = {
  submitWebhookUrl: 'https://ae485a6b2636.ngrok-free.app/webhook/submit-lead',
  readWebhookUrl: 'https://ae485a6b2636.ngrok-free.app/webhook/list-leads',
  adminPassword: '', // No default password - must be set by user
};

export type { AppConfig };

export function getConfig(): AppConfig {
  // Try to get encrypted version first
  const encrypted = localStorage.getItem(ENCRYPTED_KEY);
  if (encrypted) {
    try {
      const decrypted = decryptFromStorage(encrypted);
      const parsed = JSON.parse(decrypted);
      // Validate against schema
      const validated = configSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
      return validated;
    } catch {
      // If decryption/validation fails, try legacy unencrypted
    }
  }

  // Fallback to legacy unencrypted storage (for migration)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const config = configSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
      // Migrate to encrypted storage
      saveConfig(config).catch(() => {
        // If migration fails, continue with unencrypted
      });
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const current = getConfig();
    const merged = { ...current, ...config };
    
    // Hash password if it's being changed and is not already hashed
    // (hashed passwords are 64 chars - SHA-256 hex)
    if (merged.adminPassword && merged.adminPassword !== current.adminPassword) {
      // Check if it's already a hash (64 hex characters)
      const isAlreadyHashed = /^[a-f0-9]{64}$/i.test(merged.adminPassword);
      if (!isAlreadyHashed) {
        // It's a plain password, hash it
        merged.adminPassword = await hashPassword(merged.adminPassword);
      }
    }
    
    // Validate before saving
    const validated = configSchema.parse(merged);
    
    // Encrypt the entire config for storage
    const toEncrypt = JSON.stringify(validated);
    const encrypted = encryptForStorage(toEncrypt);
    localStorage.setItem(ENCRYPTED_KEY, encrypted);
    
    // Remove legacy unencrypted if exists
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      const zodError = error as { errors: Array<{ message: string }> };
      throw new Error(`Validation failed: ${zodError.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function isConfigured(): boolean {
  const config = getConfig();
  return Boolean(config.submitWebhookUrl);
}
