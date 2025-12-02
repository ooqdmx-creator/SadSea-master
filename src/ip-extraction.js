// Centralized IP Extraction Utility
// Used across all API endpoints to ensure consistent IP detection

/**
 * Extract user IP address from request headers
 * @param {Object} req - Express request object
 * @returns {string} - User IP address
 */
export function extractUserIP(req) {
  // Check for forwarded headers first (for proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP && firstIP !== 'unknown') {
      return firstIP;
    }
  }

  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && realIP !== 'unknown') {
    return realIP;
  }

  // Check for client IP header
  const clientIP = req.headers['x-client-ip'];
  if (clientIP && clientIP !== 'unknown') {
    return clientIP;
  }

  // Check for CF-Connecting-IP (Cloudflare)
  const cfIP = req.headers['cf-connecting-ip'];
  if (cfIP && cfIP !== 'unknown') {
    return cfIP;
  }

  // Check for True-Client-IP (Akamai)
  const trueClientIP = req.headers['true-client-ip'];
  if (trueClientIP && trueClientIP !== 'unknown') {
    return trueClientIP;
  }

  // Fallback to connection remote address
  if (req.connection && req.connection.remoteAddress) {
    const cleanIP = req.connection.remoteAddress.replace(/^::ffff:/, '');
    if (cleanIP && cleanIP !== 'unknown') {
      return cleanIP;
    }
  }

  // Fallback to socket remote address
  if (req.socket && req.socket.remoteAddress) {
    const cleanIP = req.socket.remoteAddress.replace(/^::ffff:/, '');
    if (cleanIP && cleanIP !== 'unknown') {
      return cleanIP;
    }
  }
  
  return 'Unknown';
}

export default extractUserIP;
