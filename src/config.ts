import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env file
dotenv.config()

interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  api: {
    cloudApiUrl: string;
    apiKey: string;
    models: string;
  };
  logging: {
    level: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  api: {
    cloudApiUrl: process.env.CLOUD_API_URL || '',
    apiKey: process.env.API_KEY || '',
    models: process.env.MODELS || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

// Validate configuration
if (!config.api.cloudApiUrl) {
  console.warn('Warning: CLOUD_API_URL is not set. Some API endpoints will be handled locally.')
}

if (!config.api.cloudApiUrl && !config.api.apiKey) {
  console.warn('Warning: API_KEY is not set. This might cause authentication issues if using the cloud API.')
}

export default config
