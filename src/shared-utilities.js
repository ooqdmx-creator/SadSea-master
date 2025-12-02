// Shared utilities for TOCTOU protection and other common functions
import BackendTOCTOUProtection from './toctou-protection.js';

// Global TOCTOU protection instance
let toctouProtection = null;

/**
 * Initialize TOCTOU protection instance
 * @returns {BackendTOCTOUProtection} TOCTOU protection instance
 */
export function initializeTOCTOUProtection() {
  if (!toctouProtection) {
    toctouProtection = new BackendTOCTOUProtection();
  }
  return toctouProtection;
}

/**
 * Enhanced mobile device detection function with comprehensive platform detection
 * @param {string} userAgent - User agent string
 * @returns {boolean} Whether the device is mobile
 */
export function isMobileDevice(userAgent) {
  if (!userAgent) return false;
  
  // Primary mobile detection patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isPrimaryMobile = mobileRegex.test(userAgent);
  
  // Secondary mobile detection patterns
  const isSecondaryMobile = /Mobile|Tablet/i.test(userAgent) || 
                           (userAgent.includes('Touch') && userAgent.includes('Mobile'));
  
  return isPrimaryMobile || isSecondaryMobile;
}

/**
 * Enhanced mobile platform detection with specific OS identification
 * @param {string} userAgent - User agent string
 * @returns {string} Platform type (ios, android, desktop, unknown)
 */
export function getMobilePlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  } else if (/android/.test(ua)) {
    return 'android';
  } else if (/windows|macintosh|linux/.test(ua)) {
    return 'desktop';
  } else {
    return 'unknown';
  }
}

/**
 * Check if user is in a mobile wallet browser
 * @param {string} userAgent - User agent string
 * @returns {boolean} Whether the user is in a mobile wallet browser
 */
export function isInMobileWallet(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Check for mobile wallet user agents
  const mobileWalletPatterns = [
    /phantom/i,
    /solflare/i,
    /backpack/i,
    /glow/i,
    /trust/i,
    /exodus/i,
    /coinbase/i,
    /metamask/i
  ];
  
  return mobileWalletPatterns.some(pattern => pattern.test(ua));
}
