#!/usr/bin/env node

/**
 * Application Startup Script
 * Handles environment setup and server initialization
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️ No .env file found, using default environment variables');
  console.warn('📁 Expected .env file at:', envPath);
  console.warn('💡 For production, create a .env file with required environment variables');
}

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('✅ Environment variables loaded successfully');
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

// Import and start the server
try {
  console.log('🚀 Starting server...');
  await import('./server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}
