/**
 * Mock Configuration
 * Toggle between mock data and real backend API
 *
 * Usage:
 *   - Set NEXT_PUBLIC_USE_MOCK=true in .env.local to enable mock mode
 *   - Or import and call setMockMode(true) programmatically for testing
 */

// Default to mock mode if NEXT_PUBLIC_USE_MOCK is set, otherwise use real API
export const isMockMode = () => {
  // Check environment variable first (build-time)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return true;
  }

  // Check runtime config (can be set programmatically)
  if (typeof window !== 'undefined' && window.__MOCK_MODE__ === true) {
    return true;
  }

  // Check localStorage for manual override (persists across reloads)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('mockMode');
    if (stored !== null) {
      return stored === 'true';
    }
  }

  // Default: false (use real backend)
  return false;
};

/**
 * Enable mock mode programmatically (for testing in browser console)
 * Usage in console: import('config/mock').then(m => m.enableMockMode())
 */
export const enableMockMode = () => {
  if (typeof window !== 'undefined') {
    window.__MOCK_MODE__ = true;
    localStorage.setItem('mockMode', 'true');
    console.log('✅ Mock mode ENABLED - Reload page to take effect');
  }
};

/**
 * Disable mock mode programmatically
 * Usage in console: import('config/mock').then(m => m.disableMockMode())
 */
export const disableMockMode = () => {
  if (typeof window !== 'undefined') {
    window.__MOCK_MODE__ = false;
    localStorage.setItem('mockMode', 'false');
    console.log('✅ Mock mode DISABLED - Reload page to take effect');
  }
};

/**
 * Toggle mock mode
 */
export const toggleMockMode = () => {
  const current = isMockMode();
  if (current) {
    disableMockMode();
  } else {
    enableMockMode();
  }
};

/**
 * Get current mode info for debugging
 */
export const getMockModeInfo = () => {
  const envMode = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_USE_MOCK : 'undefined';
  const windowMode = typeof window !== 'undefined' ? window.__MOCK_MODE__ : 'undefined';
  const storageMode = typeof window !== 'undefined' ? localStorage.getItem('mockMode') : 'undefined';
  const active = isMockMode();

  return {
    active,
    sources: {
      env: envMode,
      window: windowMode,
      localStorage: storageMode,
    },
    message: active ? '🟢 MOCK MODE ACTIVE' : '🔴 REAL BACKEND MODE',
  };
};

// Export default for easy importing
export default {
  isMockMode,
  enableMockMode,
  disableMockMode,
  toggleMockMode,
  getMockModeInfo,
};