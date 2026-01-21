/**
 * Authentication utilities with password hashing and session management
 * Note: Client-side hashing is not as secure as server-side hashing
 * but provides better security than plain text storage
 */

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
  if (!password || !storedHash) return false;
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
 * Clear session
 */
export function clearSession(): void {
  sessionStorage.removeItem('adminAuth');
  sessionStorage.removeItem('adminAuthTime');
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
export async function authenticate(
  password: string, 
  storedPasswordHash: string
): Promise<{
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

