import * as dotenv from 'dotenv';
dotenv.config();

export interface ConfigSchema {
  port: number;
  environment: string;
  cors: {
    origin: string | string[];
  };
  database: {
    url: string;
    poolSize: number;
  };
  redis: {
    host: string;
    port: number;
    ttl: number;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
  };
  refreshToken: {
    expiresIn: string;
  };

  resend: {
    apiKey: string;
    email: string;
  };
}

export const configuration: ConfigSchema = {
  port: parseInt(process.env.PORT || '5000', 10),
  environment: process.env.NODE_ENV || 'development',
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword2026@localhost:5432/jovianex_db',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'jovianex-super-secret-key-2026',

    refreshSecret: process.env.JWT_REFRESH_SECRET_KEY || 'jovianex-refresh-secret-2026',

    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },

  refreshToken: {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || '',

    email: process.env.CONTACT_EMAIL || '',
  },
};

export default () => configuration;
