# Security Recommendations & Implementation Guide

This document provides detailed recommendations and implementation examples for the 5 critical security issues identified in the audit.

---

## 1. ✅ Input Validation for Webhook URLs

### Problem
Webhook URLs are saved without validation, allowing invalid or malicious URLs.

### Recommendation
Add client-side URL validation using Zod schema and URL constructor validation.

### Implementation

**Step 1: Create URL validation schema**

```typescript
// src/lib/configSchema.ts
import { z } from 'zod';

// Valid URL schema with additional security checks
export const webhookUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Must be a valid URL')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Only allow HTTPS in production (or HTTP for localhost)
        return (
          parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' && parsed.hostname === 'localhost')
        );
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTPS (or HTTP for localhost only)' }
  )
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Prevent dangerous protocols
        return !['javascript:', 'data:', 'file:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    { message: 'Invalid URL protocol' }
  );

export const configSchema = z.object({
  submitWebhookUrl: webhookUrlSchema.or(z.literal('')),
  readWebhookUrl: webhookUrlSchema.or(z.literal('')),
  adminPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export type AppConfig = z.infer<typeof configSchema>;
```

**Step 2: Update config.ts to use schema**

```typescript
// src/lib/config.ts
import { configSchema, type AppConfig } from './configSchema';

const DEFAULT_CONFIG: AppConfig = {
  submitWebhookUrl: '',
  readWebhookUrl: '',
  adminPassword: '', // No default password
};

export function getConfig(): AppConfig {
  const stored = localStorage.getItem('leadProcessorConfig');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate against schema
      const validated = configSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
      return validated;
    } catch {
      // If validation fails, return defaults
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<AppConfig>): void {
  try {
    const current = getConfig();
    const merged = { ...current, ...config };
    
    // Validate before saving
    const validated = configSchema.parse(merged);
    localStorage.setItem('leadProcessorConfig', JSON.stringify(validated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
```

**Step 3: Add validation to Settings component**

```typescript
// Update src/pages/Settings.tsx
import { useState } from 'react';
import { webhookUrlSchema } from '@/lib/configSchema';
// ... other imports

export default function Settings() {
  const [config, setConfig] = useState<AppConfig>(getConfig());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const validateField = (field: keyof AppConfig, value: string) => {
    try {
      if (field === 'submitWebhookUrl' || field === 'readWebhookUrl') {
        if (value === '') {
          setErrors(prev => ({ ...prev, [field]: '' }));
          return true;
        }
        webhookUrlSchema.parse(value);
        setErrors(prev => ({ ...prev, [field]: '' }));
        return true;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
        return false;
      }
      return false;
    }
  };

  const handleSave = () => {
    try {
      saveConfig(config);
      setErrors({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      // Handle validation errors
      if (error instanceof Error) {
        setErrors({ general: error.message });
      }
    }
  };

  // Add error display in JSX
  // Show errors.errors.submitWebhookUrl, etc.
}
```

---

## 2. ✅ CSRF Protection

### Problem
Webhook submissions are vulnerable to CSRF attacks from malicious websites.

### Recommendation
Implement multiple layers of CSRF protection:
1. **Origin validation** (client-side check)
2. **SameSite cookies** (if backend supports)
3. **Custom headers** (requires backend support)
4. **Referrer validation** (additional layer)

### Implementation

**Step 1: Add origin validation helper**

```typescript
// src/lib/security.ts
/**
 * Validates that the request is coming from the same origin
 * This is a client-side check - true CSRF protection requires backend support
 */
export function validateOrigin(expectedOrigin: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentOrigin = window.location.origin;
  return currentOrigin === expectedOrigin;
}

/**
 * Adds security headers to fetch requests
 */
export function createSecureHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add custom header that backend can validate
  // Backend should reject requests without this header
  headers['X-Requested-With'] = 'XMLHttpRequest';
  
  return headers;
}

/**
 * Validates webhook URL is from expected domain (if configured)
 */
export function validateWebhookOrigin(url: string, allowedOrigins?: string[]): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) return true;
  
  try {
    const parsed = new URL(url);
    return allowedOrigins.some(origin => parsed.origin === origin);
  } catch {
    return false;
  }
}
```

**Step 2: Update LeadForm to use secure headers**

```typescript
// src/components/LeadForm.tsx
import { createSecureHeaders, validateWebhookOrigin } from '@/lib/security';

const onSubmit = async (data: LeadFormData) => {
  // ... existing code ...
  
  const config = getConfig();
  
  // Validate origin before submitting
  if (!validateWebhookOrigin(config.submitWebhookUrl)) {
    setError('Invalid webhook URL origin');
    setIsSubmitting(false);
    return;
  }

  try {
    const response = await fetch(config.submitWebhookUrl, {
      method: 'POST',
      headers: createSecureHeaders(),
      body: JSON.stringify(payload),
      // Add credentials policy
      credentials: 'omit', // Don't send cookies to external webhooks
    });
    // ... rest of code
  }
};
```

**Step 3: Backend Recommendations (for n8n webhook)**

Since this is a frontend-only app, document these requirements for the n8n backend:

```markdown
## n8n Webhook Security Requirements

1. **Validate Custom Header**: Check for `X-Requested-With: XMLHttpRequest` header
2. **Origin Validation**: Validate `Origin` or `Referer` header matches expected domain
3. **Rate Limiting**: Implement rate limiting (e.g., 10 requests per minute per IP)
4. **CORS Configuration**: Set proper CORS headers:
   - `Access-Control-Allow-Origin`: Specific domain (not *)
   - `Access-Control-Allow-Methods`: POST, OPTIONS
   - `Access-Control-Allow-Headers`: Content-Type, X-Requested-With
```

---

## 3. ✅ Console Errors in Production

### Problem
`console.error` in NotFound.tsx exposes internal routing information.

### Recommendation
Remove console errors or wrap in environment check with proper error logging.

### Implementation

**Option 1: Remove console.error (Simplest)**

```typescript
// src/pages/NotFound.tsx
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};
```

**Option 2: Environment-aware logging (Better for production)**

```typescript
// src/lib/logger.ts
const isDevelopment = import.meta.env.DEV;

export const logger = {
  error: (...args: unknown[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // In production, send to error tracking service
    // Example: Sentry.captureException(new Error(String(args[0])));
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};
```

```typescript
// src/pages/NotFound.tsx
import { logger } from '@/lib/logger';

const NotFound = () => {
  useEffect(() => {
    // Only log in development
    logger.error('404 Error: User attempted to access non-existent route');
  }, []);

  // ... rest of component
};
```

**Option 3: Error Tracking Service (Best for production)**

```typescript
// src/lib/errorTracking.ts
import * as Sentry from '@sentry/react'; // If using Sentry

export function logError(error: Error, context?: Record<string, unknown>) {
  if (import.meta.env.PROD) {
    // Send to error tracking service
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error, context);
  }
}
```

---

## 4. ✅ Sensitive Data in localStorage

### Problem
Admin password stored in plain text in localStorage, accessible via JavaScript.

### Recommendation
Since this is a frontend-only app, we can't eliminate client-side storage, but we can:
1. **Encrypt sensitive data** before storing
2. **Use sessionStorage** for temporary auth state
3. **Implement better session management**
4. **Add warnings about security limitations**

### Implementation

**Step 1: Create encryption utility (simple obfuscation - not true encryption)**

```typescript
// src/lib/encryption.ts
/**
 * Simple obfuscation for localStorage (NOT true encryption)
 * For a frontend-only app, this provides basic obfuscation
 * True security requires a backend
 */
const ENCRYPTION_KEY = 'lead-hub-key'; // In production, use env variable

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
  return simpleObfuscate(data);
}

export function decryptFromStorage(encrypted: string): string {
  return simpleDeobfuscate(encrypted);
}
```

**Step 2: Update config.ts to encrypt sensitive data**

```typescript
// src/lib/config.ts
import { encryptForStorage, decryptFromStorage } from './encryption';
import { configSchema, type AppConfig } from './configSchema';

const STORAGE_KEY = 'leadProcessorConfig';
const ENCRYPTED_KEY = 'leadProcessorConfigEnc';

export function getConfig(): AppConfig {
  // Try to get encrypted version first
  const encrypted = localStorage.getItem(ENCRYPTED_KEY);
  if (encrypted) {
    try {
      const decrypted = decryptFromStorage(encrypted);
      const parsed = JSON.parse(decrypted);
      return configSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
    } catch {
      // If decryption fails, try legacy unencrypted
    }
  }

  // Fallback to legacy unencrypted storage (for migration)
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const config = configSchema.parse({ ...DEFAULT_CONFIG, ...parsed });
      // Migrate to encrypted storage
      saveConfig(config);
      localStorage.removeItem(STORAGE_KEY);
      return config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: Partial<AppConfig>): void {
  try {
    const current = getConfig();
    const merged = { ...current, ...config };
    const validated = configSchema.parse(merged);
    
    // Encrypt sensitive data
    const toEncrypt = {
      ...validated,
      adminPassword: validated.adminPassword ? encryptForStorage(validated.adminPassword) : '',
    };
    
    const encrypted = encryptForStorage(JSON.stringify(toEncrypt));
    localStorage.setItem(ENCRYPTED_KEY, encrypted);
    
    // Remove legacy unencrypted if exists
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}
```

**Step 3: Update Admin.tsx to decrypt password for comparison**

```typescript
// src/pages/Admin.tsx
import { decryptFromStorage } from '@/lib/encryption';

const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  const config = getConfig();
  
  // Decrypt stored password for comparison
  const storedPassword = config.adminPassword 
    ? decryptFromStorage(config.adminPassword)
    : '';
  
  if (password === storedPassword && storedPassword.length > 0) {
    // Use sessionStorage for auth state (cleared on browser close)
    const sessionToken = generateSessionToken();
    sessionStorage.setItem('adminAuth', sessionToken);
    sessionStorage.setItem('adminAuthTime', Date.now().toString());
    setIsAuthenticated(true);
    setAuthError('');
  } else {
    setAuthError('Incorrect password');
  }
};
```

**Step 4: Add security warning in Settings**

```typescript
// Add to Settings.tsx
<div className="rounded-md bg-warning/10 border border-warning/20 p-3">
  <div className="flex items-start gap-2">
    <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
    <div className="text-xs text-warning">
      <p className="font-medium mb-1">Security Notice</p>
      <p>
        This is a frontend-only application. Passwords are obfuscated but not truly encrypted.
        For production use, implement a backend authentication system.
      </p>
    </div>
  </div>
</div>
```

---

## 5. ✅ Weak Authentication System

### Problem
- Plain text password comparison
- No hashing
- Weak default password
- No session expiration
- No rate limiting

### Recommendation
Implement a more secure authentication system with:
1. **Password hashing** (client-side using Web Crypto API)
2. **Session tokens** with expiration
3. **Rate limiting** for login attempts
4. **Password strength requirements**
5. **Session timeout**

### Implementation

**Step 1: Create authentication utilities**

```typescript
// src/lib/auth.ts
import { decryptFromStorage } from './encryption';

const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

interface LoginAttempt {
  count: number;
  lockoutUntil: number | null;
}

/**
 * Hash password using Web Crypto API (SHA-256)
 * Note: This is still client-side hashing. True security requires backend.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify password against stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === storedHash;
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if session is valid
 */
export function isSessionValid(): boolean {
  const token = sessionStorage.getItem('adminAuth');
  const authTime = sessionStorage.getItem('adminAuthTime');
  
  if (!token || !authTime) return false;
  
  const elapsed = Date.now() - parseInt(authTime, 10);
  if (elapsed > SESSION_DURATION) {
    // Session expired
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminAuthTime');
    return false;
  }
  
  return true;
}

/**
 * Get login attempt data
 */
function getLoginAttempts(): LoginAttempt {
  const stored = sessionStorage.getItem('loginAttempts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { count: 0, lockoutUntil: null };
    }
  }
  return { count: 0, lockoutUntil: null };
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(): LoginAttempt {
  const attempts = getLoginAttempts();
  attempts.count += 1;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockoutUntil = Date.now() + LOCKOUT_DURATION;
  }
  
  sessionStorage.setItem('loginAttempts', JSON.stringify(attempts));
  return attempts;
}

/**
 * Clear login attempts (on successful login)
 */
function clearLoginAttempts(): void {
  sessionStorage.removeItem('loginAttempts');
}

/**
 * Check if account is locked out
 */
export function isLockedOut(): boolean {
  const attempts = getLoginAttempts();
  
  if (attempts.lockoutUntil && Date.now() < attempts.lockoutUntil) {
    return true;
  }
  
  // Clear lockout if expired
  if (attempts.lockoutUntil && Date.now() >= attempts.lockoutUntil) {
    clearLoginAttempts();
  }
  
  return false;
}

/**
 * Get remaining lockout time in seconds
 */
export function getLockoutRemaining(): number {
  const attempts = getLoginAttempts();
  if (attempts.lockoutUntil) {
    const remaining = attempts.lockoutUntil - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }
  return 0;
}

/**
 * Authenticate user
 */
export async function authenticate(password: string, storedPasswordHash: string): Promise<{
  success: boolean;
  error?: string;
  lockoutRemaining?: number;
}> {
  // Check lockout
  if (isLockedOut()) {
    const remaining = getLockoutRemaining();
    return {
      success: false,
      error: `Account locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
      lockoutRemaining: remaining,
    };
  }
  
  // Verify password
  const isValid = await verifyPassword(password, storedPasswordHash);
  
  if (isValid) {
    clearLoginAttempts();
    const token = generateSessionToken();
    sessionStorage.setItem('adminAuth', token);
    sessionStorage.setItem('adminAuthTime', Date.now().toString());
    return { success: true };
  } else {
    const attempts = recordFailedAttempt();
    const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts.count;
    
    if (attempts.lockoutUntil) {
      const remaining = getLockoutRemaining();
      return {
        success: false,
        error: `Too many failed attempts. Account locked for ${Math.ceil(remaining / 60)} minutes.`,
        lockoutRemaining: remaining,
      };
    }
    
    return {
      success: false,
      error: `Incorrect password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
    };
  }
}
```

**Step 2: Update config to store hashed passwords**

```typescript
// Update config.ts to hash passwords before storage
import { hashPassword } from './auth';

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  try {
    const current = getConfig();
    const merged = { ...current, ...config };
    
    // Hash password if provided
    if (merged.adminPassword && merged.adminPassword !== current.adminPassword) {
      merged.adminPassword = await hashPassword(merged.adminPassword);
    }
    
    const validated = configSchema.parse(merged);
    // ... rest of save logic
  }
}
```

**Step 3: Update Admin.tsx to use new auth system**

```typescript
// src/pages/Admin.tsx
import { authenticate, isSessionValid, getLockoutRemaining } from '@/lib/auth';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  useEffect(() => {
    if (isSessionValid()) {
      setIsAuthenticated(true);
    }
  }, []);

  // Check lockout status
  useEffect(() => {
    if (isLockedOut()) {
      const remaining = getLockoutRemaining();
      setLockoutRemaining(remaining);
      const interval = setInterval(() => {
        const newRemaining = getLockoutRemaining();
        setLockoutRemaining(newRemaining);
        if (newRemaining === 0) {
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = getConfig();
    
    if (!config.adminPassword) {
      setAuthError('Admin password not configured. Please set it in Settings.');
      return;
    }

    const result = await authenticate(password, config.adminPassword);
    
    if (result.success) {
      setIsAuthenticated(true);
      setAuthError('');
      setPassword('');
    } else {
      setAuthError(result.error || 'Authentication failed');
      if (result.lockoutRemaining) {
        setLockoutRemaining(result.lockoutRemaining);
      }
    }
  };

  // Add lockout message in JSX
  // Show lockoutRemaining countdown if > 0
}
```

**Step 4: Add password strength requirements**

```typescript
// src/lib/passwordValidation.ts
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('At least 8 characters');

  if (password.length >= 12) score++;
  else if (password.length < 8) feedback.push('Consider 12+ characters for better security');

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else feedback.push('Mix of uppercase and lowercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  return {
    score,
    feedback: feedback.length > 0 ? feedback : ['Strong password'],
    isValid: score >= 3 && password.length >= 8,
  };
}
```

---

## Summary of Changes

### Files to Create:
1. `src/lib/configSchema.ts` - Zod schemas for validation
2. `src/lib/security.ts` - Security utilities (CSRF, origin validation)
3. `src/lib/encryption.ts` - Simple obfuscation for localStorage
4. `src/lib/auth.ts` - Authentication utilities
5. `src/lib/passwordValidation.ts` - Password strength checker
6. `src/lib/logger.ts` - Environment-aware logging

### Files to Update:
1. `src/lib/config.ts` - Add validation and encryption
2. `src/pages/Settings.tsx` - Add validation and error display
3. `src/pages/Admin.tsx` - Use new auth system
4. `src/components/LeadForm.tsx` - Add secure headers
5. `src/pages/NotFound.tsx` - Remove or wrap console.error

### Important Notes:

⚠️ **Frontend-Only Limitations:**
- Client-side encryption/obfuscation is NOT true security
- Passwords can still be extracted with browser dev tools
- True security requires a backend authentication system
- These improvements provide defense-in-depth but are not foolproof

✅ **Best Practices for Production:**
- Implement a backend API for authentication
- Use JWT tokens with httpOnly cookies
- Implement server-side rate limiting
- Use environment variables for sensitive config
- Add proper CORS configuration
- Implement proper session management

---

## Implementation Priority

1. **High Priority (Do First):**
   - Input validation for webhook URLs
   - Remove console.error
   - Basic session management

2. **Medium Priority:**
   - Password hashing
   - Rate limiting
   - Encryption for localStorage

3. **Low Priority (Nice to Have):**
   - Password strength indicator
   - Advanced CSRF protection
   - Error tracking service

Would you like me to implement any of these solutions?

