// Health check endpoint for Vercel deployment
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // Check environment variables
    const envStatus = {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      RPC_URL: process.env.RPC_URL ? 'set' : 'not set',
      RECEIVER_WALLET: process.env.RECEIVER_WALLET ? 'set' : 'not set',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? 'set' : 'not set',
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? 'set' : 'not set'
    };
    
    // Check if critical variables are set
    const isHealthy = process.env.RPC_URL && process.env.RECEIVER_WALLET;
    
    const healthData = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: envStatus,
      deployment: 'vercel',
      issues: []
    };
    
    // Add issues if any
    if (!process.env.RPC_URL) {
      healthData.issues.push('RPC_URL not set');
    }
    if (!process.env.RECEIVER_WALLET) {
      healthData.issues.push('RECEIVER_WALLET not set');
    }
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      healthData.issues.push('TELEGRAM_BOT_TOKEN not set (optional)');
    }
    if (!process.env.TELEGRAM_CHAT_ID) {
      healthData.issues.push('TELEGRAM_CHAT_ID not set (optional)');
    }
    
    res.status(isHealthy ? 200 : 503).json(healthData);
    
  } catch (error) {
    console.error('[HEALTH] Error in health check:', error);
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
