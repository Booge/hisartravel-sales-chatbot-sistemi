import dotenv from 'dotenv';
dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'change-this-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  OPENAI_DEFAULT_MODEL: process.env.OPENAI_DEFAULT_MODEL || 'gpt-5.4-mini',
  OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL || 'gpt-5.4',
  OPENAI_FAST_MODEL: process.env.OPENAI_FAST_MODEL || 'gpt-5.4-nano',

  // WhatsApp
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED === 'true',
  WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth',

  // Upload
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB

  // Chat
  MAX_CONTEXT_MESSAGES: parseInt(process.env.MAX_CONTEXT_MESSAGES || '20', 10),
  BOT_NAME: process.env.BOT_NAME || 'Sales Assistant',
};

// Validate required env vars
const required = ['DATABASE_URL', 'OPENAI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`⚠️  Missing required env var: ${key}`);
  }
}
